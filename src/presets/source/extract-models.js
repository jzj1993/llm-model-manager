#!/usr/bin/env node

/**
 * 从openrouter-models.json和openclaw-models.json提取model信息
 * 并合并到model-presets.json
 *
 * 数据来源：
 * curl https://openrouter.ai/api/v1/models?output_modalities=all
 * openclaw models list --all --json
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG = {
  openrouterModels: path.join(__dirname, 'openrouter-models.json'),
  openclawModels: path.join(__dirname, 'openclaw-models.json'),
  output: path.join(__dirname, 'model-presets.json')
};

console.log('=== Model提取脚本 ===\n');

/**
 * 读取并解析JSON文件
 */
function readJSONFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filepath}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 处理OpenRouter model数据
 */
function processOpenRouterModels(data) {
  console.log(`处理OpenRouter models: ${data.data.length}个`);
  
  // 筛选output_modalities包含text的models
  const filteredModels = data.data.filter(m => {
    const outputModalities = m.architecture?.output_modalities || [];
    return outputModalities.includes('text');
  });
  
  console.log(`  筛选后保留: ${filteredModels.length}个 (output_modalities包含'text')`);
  
  return filteredModels.map(m => {
    const slashIndex = m.id.indexOf('/');
    const provider = slashIndex !== -1 ? m.id.substring(0, slashIndex) : m.id;
    const modelId = slashIndex !== -1 ? m.id.substring(slashIndex + 1) : m.id;
    const supportedParams = m.supported_parameters || [];
    const outputModalities = m.architecture?.output_modalities;
    const hasOutput = Array.isArray(outputModalities) && outputModalities.length > 0;
    const reasoningValue = supportedParams.length > 0
      ? supportedParams.includes('reasoning')
      : null;
    
    return {
      provider: provider,
      id: modelId,
      name: m.name,
      contextWindow: m.context_length || null,
      maxCompletionTokens: m.top_provider?.max_completion_tokens || null,
      reasoning: reasoningValue,
      input: m.architecture?.input_modalities || [],
      ...(hasOutput ? { output: outputModalities } : {}),
      description: m.description || null,
      source: 'openrouter'
    };
  });
}

/**
 * 处理OpenClaw model数据
 */
function processOpenClawModels(data) {
  console.log(`处理OpenClaw models: ${data.models.length}个`);
  
  return data.models.map(m => {
    const slashIndex = m.key.indexOf('/');
    const provider = slashIndex !== -1 ? m.key.substring(0, slashIndex) : m.key;
    const modelId = slashIndex !== -1 ? m.key.substring(slashIndex + 1) : m.key;
    const inputStr = m.input || '';
    
    // OpenClaw的input格式是 "text+image"，需要转换为数组
    const inputArray = inputStr ? inputStr.split('+').map(m => m.trim()).filter(m => m) : [];
    
    return {
      provider: provider,
      id: modelId,
      name: m.name,
      contextWindow: m.contextWindow || null,
      maxCompletionTokens: null,
      reasoning: null,
      input: inputArray,
      source: 'openclaw'
    };
  });
}

/**
 * 合并并去重models
 */
function mergeModels(openRouterModels, openClawModels) {
  const map = new Map();
  
  // 使用 provider+id 作为唯一键
  const getKey = (m) => `${m.provider}:${m.id}`;
  
  // 先添加OpenRouter的models
  openRouterModels.forEach(m => {
    map.set(getKey(m), m);
  });
  
  // 再添加OpenClaw的models（覆盖重复的）
  openClawModels.forEach(m => {
    map.set(getKey(m), m);
  });
  
  return Array.from(map.values());
}

/**
 * 排序models（按provider，然后按ID）
 */
function sortModels(models) {
  return models.sort((a, b) => {
    const providerCompare = a.provider.localeCompare(b.provider);
    if (providerCompare !== 0) {
      return providerCompare;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * 打印统计信息
 */
function printStats(models) {
  console.log('\n=== 统计信息 ===');
  console.log(`唯一models总数: ${models.length}`);

  // 统计每个provider的model数量
  const providerStats = {};
  models.forEach(m => {
    providerStats[m.provider] = (providerStats[m.provider] || 0) + 1;
  });

  // 按数量排序
  const sortedProviders = Object.entries(providerStats)
    .sort((a, b) => b[1] - a[1]);

  console.log(`唯一providers数量: ${sortedProviders.length}`);

  console.log('\nTop 10 Provider (按model数量):');
  sortedProviders.slice(0, 10).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count}个`);
  });

  if (sortedProviders.length > 10) {
    console.log(`  ... 其他 ${sortedProviders.length - 10}个providers`);
  }

// 统计字段完整性
  const withContextWindow = models.filter(m => m.contextWindow !== null && m.contextWindow !== '').length;
  const withDescription = models.filter(m => m.description != null && m.description !== '').length;
  const withInput = models.filter(m => m.input != null && m.input.length > 0).length;
  const withOutput = models.filter(m => m.output != null && m.output.length > 0).length;
  const withReasoning = models.filter(m => m.reasoning === true).length;
  const withMaxCompletionTokens = models.filter(m => m.maxCompletionTokens !== null && m.maxCompletionTokens !== undefined).length;
  
  console.log('\n字段完整性:');
  console.log(`  有contextWindow: ${withContextWindow}/${models.length} (${(withContextWindow/models.length*100).toFixed(1)}%)`);
  console.log(`  有description: ${withDescription}/${models.length} (${(withDescription/models.length*100).toFixed(1)}%)`);
  console.log(`  有input: ${withInput}/${models.length} (${(withInput/models.length*100).toFixed(1)}%)`);
  console.log(`  有output: ${withOutput}/${models.length} (${(withOutput/models.length*100).toFixed(1)}%)`);
  console.log(`  支持reasoning: ${withReasoning}/${models.length} (${(withReasoning/models.length*100).toFixed(1)}%)`);
  console.log(`  有maxCompletionTokens: ${withMaxCompletionTokens}/${models.length} (${(withMaxCompletionTokens/models.length*100).toFixed(1)}%)`);
  
  // 统计input类型分布
  const inputTypeStats = {};
  models.forEach(m => {
    if (m.input && m.input.length > 0) {
      const inputType = m.input.sort().join('+'); // 排序后join以便统计
      inputTypeStats[inputType] = (inputTypeStats[inputType] || 0) + 1;
    }
  });
  
  console.log('\nInput类型分布:');
  const sortedInputTypes = Object.entries(inputTypeStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sortedInputTypes.forEach(([inputType, count]) => {
    const types = inputType.split('+').map(t => `"${t}"`).join(', ');
    console.log(`  [${types}]: ${count}个`);
  });
  
  if (Object.keys(inputTypeStats).length > 10) {
    console.log(`  ... 其他 ${Object.keys(inputTypeStats).length - 10}种类型`);
  }
  
  // 统计output类型分布
  const outputTypeStats = {};
  models.forEach(m => {
    if (m.output && m.output.length > 0) {
      const outputType = m.output.sort().join('+');
      outputTypeStats[outputType] = (outputTypeStats[outputType] || 0) + 1;
    }
  });
  
  console.log('\nOutput类型分布:');
  const sortedOutputTypes = Object.entries(outputTypeStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sortedOutputTypes.forEach(([outputType, count]) => {
    const types = outputType.split('+').map(t => `"${t}"`).join(', ');
    console.log(`  [${types}]: ${count}个`);
  });
  
  if (Object.keys(outputTypeStats).length > 10) {
    console.log(`  ... 其他 ${Object.keys(outputTypeStats).length - 10}种类型`);
  }
  
  // 统计数据来源
  const sourceStats = {};
  models.forEach(m => {
    sourceStats[m.source] = (sourceStats[m.source] || 0) + 1;
  });
  
  console.log('\n数据来源:');
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}个`);
  });
}

/**
 * 保存到文件
 */
function saveToFile(models, filepath) {
  try {
    const json = JSON.stringify(models, null, 2);
    fs.writeFileSync(filepath, json, 'utf8');
    console.log(`\n保存成功: ${filepath}`);
    console.log(`文件大小: ${(json.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`写入文件失败: ${filepath}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('读取文件...\n');

  // 读取文件
  const openrouterData = readJSONFile(CONFIG.openrouterModels);
  const openclawData = readJSONFile(CONFIG.openclawModels);

  // 处理数据
  console.log('\n处理数据...\n');
  const openRouterModels = processOpenRouterModels(openrouterData);
  const openClawModels = processOpenClawModels(openclawData);

  // 合并并去重
  console.log('\n合并数据...\n');
  const mergedModels = mergeModels(openRouterModels, openClawModels);

  // 排序
  const sortedModels = sortModels(mergedModels);

  // 打印统计信息
  printStats(sortedModels);

  // 保存文件
  saveToFile(sortedModels, CONFIG.output);

  console.log('\n✓ 完成！');
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  processOpenRouterModels,
  processOpenClawModels,
  mergeModels,
  sortModels
};

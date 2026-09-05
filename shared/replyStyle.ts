/** The user's current length request takes precedence over saved style preferences. */
export function currentReplyStyle(message: string): string {
  if (/(?:一句话|一句中文|只[用说回答]{0,3}一句)/.test(message)) {
    return "\n【本轮回复长度优先要求】用户要求只用一句话：只写一个完整的中文句子，尽量不超过35个字。直接回答或鼓励，不加开场感叹、括号旁白、重复夸奖或追问。情绪标签另起一行，不算正文。";
  }
  if (/(?:简短|简洁|简要|短一点)/.test(message)) {
    return "\n【本轮回复长度优先要求】请直接回答本轮问题，正文不超过两句、尽量不超过60个字，不追加括号旁白或无关撒娇。情绪标签另起一行。";
  }
  return "";
}

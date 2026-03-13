/**
 * 生成符合 RFC4122 标准的 UUID v4
 *
 * 优先级策略：
 * 1. 优先使用 crypto.randomUUID() - 最快且最安全（现代浏览器）
 * 2. 其次使用 crypto.getRandomValues() - 密码学安全的随机数
 * 3. 降级使用 Math.random() - 向后兼容旧环境（不推荐用于安全敏感场景）
 *
 * @returns 返回格式为 xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx 的 UUID 字符串
 */
export function getUuid(): string {
  // 现代浏览器优先使用原生 crypto.randomUUID() API
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }

  // 使用 crypto.getRandomValues() 生成密码学安全的随机数
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // 设置版本号（version 4）
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // 设置变体位（variant 1）
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    // 转换为 UUID 格式字符串
    const hex = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // 降级方案：使用 Math.random()（不推荐用于生产环境）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

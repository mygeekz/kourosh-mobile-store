export const makeSparklinePoints = (values: number[] = []) => {
  const source = values.length ? values : [18, 24, 22, 28, 20, 30, 26];
  const min = Math.min(...source);
  const max = Math.max(...source);
  const range = Math.max(1, max - min);
  const width = 188;
  const height = 48;

  return source.map((value, index) => {
    const x = source.length === 1 ? width / 2 : (index / (source.length - 1)) * width;
    const y = height - ((value - min) / range) * 34 - 7;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
};

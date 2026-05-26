type DetailChartPoint = {
  timeStamp: string;
  [key: string]: number | string;
};

export function appendDetailChartSample<T extends DetailChartPoint>(
  currentData: T[],
  sample: T,
  valueKeys: (keyof T & string)[],
  interpolationSteps: number,
  maxPoints = 60,
): T[] {
  if (currentData.length === 0) {
    return [sample, sample].slice(-maxPoints);
  }

  const previous = currentData[currentData.length - 1];
  const previousTime = Number(previous.timeStamp);
  const sampleTime = Number(sample.timeStamp);
  const steps = Math.max(1, interpolationSteps);
  const nextPoints: T[] = [];

  for (let step = 1; step <= steps; step++) {
    const ratio = step / steps;
    const point = {
      ...sample,
      timeStamp: Math.round(previousTime + (sampleTime - previousTime) * ratio).toString(),
    } as T;

    valueKeys.forEach((key) => {
      const previousValue = Number(previous[key]);
      const sampleValue = Number(sample[key]);
      point[key] = (previousValue + (sampleValue - previousValue) * ratio) as T[typeof key];
    });

    nextPoints.push(point);
  }

  return [...currentData, ...nextPoints].slice(-maxPoints);
}

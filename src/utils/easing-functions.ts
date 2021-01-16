type EasingFunction = (currentTime: number, startValue: number, changeValue: number, duration: number) => number;

const linear = (currentTime: number, startValue: number, changeValue: number, duration: number) => {
  return (changeValue * currentTime) / duration + startValue;
};

const easeInQuad = (currentTime: number, startValue: number, changeValue: number, duration: number) => {
  currentTime /= duration;
  return changeValue * currentTime * currentTime + startValue;
};

const easeOutQuad = (currentTime: number, startValue: number, changeValue: number, duration: number) => {
  currentTime /= duration;
  return -changeValue * currentTime * (currentTime - 2) + startValue;
};

const easeInOutQuad = (currentTime: number, startValue: number, changeValue: number, duration: number) => {
  currentTime /= duration / 2;
  if (currentTime < 1) return (changeValue / 2) * currentTime * currentTime + startValue;
  currentTime--;
  return (-changeValue / 2) * (currentTime * (currentTime - 2) - 1) + startValue;
};

export { EasingFunction, linear, easeInQuad, easeOutQuad, easeInOutQuad };

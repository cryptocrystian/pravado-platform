export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const isEmpty = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

export const merge = <T extends object>(...objects: Partial<T>[]): T => {
  return Object.assign({}, ...objects) as T;
};

export const deepMerge = <T extends object>(...objects: Partial<T>[]): T => {
  const isObject = (obj: unknown): obj is object => {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  };

  return objects.reduce((result, current) => {
    Object.keys(current).forEach((key) => {
      const resultValue = (result as Record<string, unknown>)[key];
      const currentValue = (current as Record<string, unknown>)[key];

      if (isObject(resultValue) && isObject(currentValue)) {
        (result as Record<string, unknown>)[key] = deepMerge(resultValue, currentValue);
      } else {
        (result as Record<string, unknown>)[key] = currentValue;
      }
    });
    return result;
  }, {} as T);
};

export const getNestedValue = <T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined => {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }

  return result as T;
};

export const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
};

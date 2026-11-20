import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = (key, initialValue, options = {}) => {
  const { serialize = JSON.stringify, deserialize = JSON.parse, validator } = options;

  const readValue = useCallback(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      const parsed = deserialize(item);
      if (validator && !validator(parsed)) return initialValue;
      return parsed;
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
      return initialValue;
    }
  }, [key, initialValue, deserialize, validator]);

  const [storedValue, setStoredValue] = useState(readValue);

  const setValue = useCallback((value) => {
    if (typeof window === 'undefined') {
      console.warn('localStorage not available');
      return;
    }
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, serialize(valueToStore));
      window.dispatchEvent(new Event('local-storage-change'));
    } catch (e) {
      console.warn(`Error setting localStorage key "${key}":`, e);
    }
  }, [key, serialize, storedValue]);

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      window.dispatchEvent(new Event('local-storage-change'));
    } catch (e) {
      console.warn(`Error removing localStorage key "${key}":`, e);
    }
  }, [key, initialValue]);

  useEffect(() => {
    const handleStorageChange = () => setStoredValue(readValue());
    window.addEventListener('local-storage-change', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [readValue]);

  return [storedValue, setValue, removeValue];
};

export const useLocalStorageState = (key, initialValue, options) => {
  const [value, setValue, removeValue] = useLocalStorage(key, initialValue, options);
  return [value, setValue, removeValue];
};
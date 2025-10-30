import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      // Save state
      setStoredValue(valueToStore)
      
      // Save to both localStorage and sessionStorage as backup
      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(valueToStore)
        window.localStorage.setItem(key, serialized)
        window.sessionStorage.setItem(key, serialized)
        console.log(`Saved to storage [${key}]:`, valueToStore)
      }
    } catch (error) {
      console.error(`Error saving to storage [${key}]:`, error)
    }
  }

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Try localStorage first, then sessionStorage as fallback
        let item = window.localStorage.getItem(key)
        if (!item) {
          item = window.sessionStorage.getItem(key)
          console.log(`Falling back to sessionStorage for [${key}]`)
        }
        
        if (item) {
          const parsed = JSON.parse(item)
          console.log(`Loaded from storage [${key}]:`, parsed)
          setStoredValue(parsed)
        } else {
          console.log(`No stored value found for [${key}], using initial value`)
        }
        setIsLoaded(true)
      }
    } catch (error) {
      console.error(`Error loading from storage [${key}]:`, error)
      setIsLoaded(true)
    }
  }, [key])

  return [storedValue, setValue, isLoaded] as const
}

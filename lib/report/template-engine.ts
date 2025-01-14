type Context = Record<string, unknown>;
type ContextValue = string | number | boolean | null | undefined | Context | unknown[];

function getValueFromPath(context: Context, path: string[]): ContextValue {
  let value: unknown = context;
  for (const prop of path) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object' && value !== null) {
      value = (value as Record<string, unknown>)[prop];
    } else {
      return '';
    }
  }
  return value as ContextValue;
}

function interpolate(template: string, context: Context): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
    const path = key.trim().split('.');
    const value = getValueFromPath(context, path);
    return value !== undefined ? String(value) : '';
  });
}

function formatNumber(value: ContextValue, format?: string): string {
  if (typeof value !== 'number') return '';
  const num = value;
  
  const precision = format ? parseInt(format.replace(/[^0-9]/g, '') || '0', 10) : 0;
  if (format?.startsWith('+')) {
    return (num >= 0 ? '+' : '') + num.toFixed(precision);
  }
  return num.toFixed(precision);
}

function formatDate(value: ContextValue): string {
  if (typeof value !== 'string') return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function processFilters(template: string, context: Context): string {
  // Process number filter
  template = template.replace(/\{\{\s*([^}|]+)\s*\|\s*number\(['"]([^'"]+)['"]\)\s*\}\}/g, 
    (match, key, format) => {
      const value = getValueFromPath(context, key.trim().split('.'));
      return formatNumber(value, format);
    }
  );

  // Process date filter
  template = template.replace(/\{\{\s*([^}|]+)\s*\|\s*date\([^)]*\)\s*\}\}/g,
    (match, key) => {
      const value = getValueFromPath(context, key.trim().split('.'));
      return formatDate(value);
    }
  );

  // Process title filter
  template = template.replace(/\{\{\s*([^}|]+)\s*\|\s*title\s*\}\}/g,
    (match, key) => {
      const value = getValueFromPath(context, key.trim().split('.'));
      return typeof value === 'string' ? 
        value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
    }
  );

  return template;
}

function processLoops(template: string, context: Context): string {
  const loopRegex = /\{%-?\s*for\s+(\w+)\s+in\s+([^%]+)\s*-?%\}([\s\S]*?)\{%-?\s*endfor\s*-?%\}/g;
  
  return template.replace(loopRegex, (match, itemName, arrayPath, content) => {
    const value = getValueFromPath(context, arrayPath.trim().split('.'));
    if (!Array.isArray(value)) return '';
    
    return value.map(item => {
      const itemContext = { ...context, [itemName]: item };
      return processTemplate(content, itemContext);
    }).join('');
  });
}

function processConditionals(template: string, context: Context): string {
  const ifRegex = /\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/g;
  
  return template.replace(ifRegex, (match, condition, ifContent, elseContent = '') => {
    const evalCondition = (cond: string): boolean => {
      if (cond.includes(' in ')) {
        const [value, array] = cond.split(' in ').map(s => s.trim());
        const values = value.replace(/[[\]']/g, '').split(',').map(s => s.trim());
        const arrayValue = getValueFromPath(context, array.split('.'));
        return values.some(v => arrayValue === v);
      }
      
      const value = getValueFromPath(context, condition.trim().split('.'));
      return Boolean(value);
    };

    return evalCondition(condition) ? 
      processTemplate(ifContent, context) : 
      processTemplate(elseContent, context);
  });
}

export function processTemplate(template: string, context: Context): string {
  let result = template;
  
  // Process loops first
  result = processLoops(result, context);
  
  // Process conditionals
  result = processConditionals(result, context);
  
  // Process filters
  result = processFilters(result, context);
  
  // Process simple interpolation
  result = interpolate(result, context);
  
  return result;
}

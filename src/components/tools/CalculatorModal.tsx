import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CalculatorModalProps {
  onClose: () => void;
}

export default function CalculatorModal({ onClose }: CalculatorModalProps) {
  const [calcValue, setCalcValue] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');

  const handleCalc = (val: string) => {
    if (val === "=") {
      try {
        const fullExpression = calcExpression + calcValue;
        const sanitizedExpression = fullExpression.replace(/[^-+*/0-9.]/g, '');
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${sanitizedExpression})`)();
        setCalcValue(String(result));
        setCalcExpression('');
      } catch (e) {
        setCalcValue("Error");
        setCalcExpression("");
      }
    } else if (val === "C") {
      setCalcValue("0");
      setCalcExpression("");
    } else if (val === "DEL") {
      setCalcValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (['+', '-', '*', '/', '%'].includes(val)) {
      setCalcExpression(calcValue + val);
      setCalcValue('0');
    } else {
      setCalcValue(prev => prev === '0' || prev === 'Error' ? val : prev + val);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl text-right">
        <div className="text-xs text-gray-500 h-4">{calcExpression}</div>
        <div className="text-2xl font-mono font-bold truncate">{calcValue}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['C', 'DEL', '%', '/'].map(btn => (
          <button 
            key={btn} 
            onClick={() => handleCalc(btn)}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-purple-600"
          >
            {btn}
          </button>
        ))}
        {['7','8','9','*','4','5','6','-','1','2','3','+'].map(btn => (
          <button 
            key={btn} 
            onClick={() => handleCalc(btn)}
            className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {btn}
          </button>
        ))}
        <button onClick={() => handleCalc('.')} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">.</button>
        <button onClick={() => handleCalc('0')} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">0</button>
        <button 
          onClick={() => handleCalc('=')}
          className="h-12 col-span-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
        >
          =
        </button>
      </div>
    </div>
  );
}

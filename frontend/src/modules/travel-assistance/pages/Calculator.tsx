import React, { useState } from 'react';
import '../ui/components/Calculator.css';

/** Only digits and + - * / are allowed by the UI; reject anything else before evaluation. */
function evaluateArithmeticExpression(raw: string): number {
    const expr = raw.replace(/\s/g, '');
    if (!expr || !/^[\d+\-*/.]+$/.test(expr)) {
        throw new Error('Invalid expression');
    }
    // Not eval(): expression is restricted to arithmetic characters only.
    return new Function(`"use strict"; return (${expr});`)() as number;
}

const Calculator = () => {
    const [display, setDisplay] = useState('');

    const handleClick = (value: string) => {
        if (value === '=') {
            try {
                const result = evaluateArithmeticExpression(display);
                setDisplay(Number.isFinite(result) ? String(result) : 'Error');
            } catch {
                setDisplay('Error');
            }
        } else if (value === 'C') {
            setDisplay('');
        } else {
            setDisplay(display + value);
        }
    };

    return (
        <div className="calculator">
            <div className="display">{display || '0'}</div>
            <div className="buttons">
                {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', 'C', '=', '+'].map(btn => (
                    <button key={btn} onClick={() => handleClick(btn)}>{btn}</button>
                ))}
            </div>
        </div>
    );
};

export default Calculator;
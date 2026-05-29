import React, { useState, useEffect } from 'react';
import '../ui/components/Calculator.css';

function evaluateArithmeticExpression(raw: string): number {
    const expr = raw.replace(/\s/g, '');
    if (!expr || !/^[\d+\-*/.]+$/.test(expr)) {
        throw new Error('Invalid expression');
    }
    return new Function(`"use strict"; return (${expr});`)() as number;
}

const Calculator = () => {
    const [display, setDisplay] = useState('');

    const handleAction = (value: string) => {
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
            setDisplay(prev => (prev === 'Error' ? value : prev + value));
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.startsWith('F') && !isNaN(Number(event.key.substring(1)))) {
                return;
            }

            const ignoredKeys = [
                'Control', 'Alt', 'Shift', 'Meta', 'Tab', 'Escape', 'CapsLock',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Pause'
            ];

            if (ignoredKeys.includes(event.key)) {
                return;
            }

            const target = event.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                return;
            }

            const key = event.key;

            if (/[\d+\-*/.]/.test(key)) {
                event.preventDefault();
                handleAction(key);
            } 
            else if (key === 'Enter') {
                event.preventDefault();
                handleAction('=');
            } 
            else if (key === 'Escape' || key === 'Delete') {
                event.preventDefault();
                handleAction('C');
            }
            else if (key === 'Backspace') {
                event.preventDefault();
                setDisplay(prev => (prev === 'Error' ? '' : prev.slice(0, -1)));
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [display]);

    return (
        <div className="calculator">
            <div className="display">{display || '0'}</div>
            <div className="buttons">
                {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', 'C', '=', '+'].map(btn => (
                    <button key={btn} onClick={() => handleAction(btn)}>{btn}</button>
                ))}
            </div>
        </div>
    );
};

export default Calculator;
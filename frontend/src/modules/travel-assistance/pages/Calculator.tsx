import React, { useState } from 'react';
import '../ui/components/Calculator.css';

const Calculator = () => {
    const [display, setDisplay] = useState('');

    const handleClick = (value: string) => {
        if (value === '=') {
            try {
                setDisplay(eval(display).toString());
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
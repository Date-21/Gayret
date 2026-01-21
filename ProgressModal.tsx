import React, { useState, useEffect } from 'react';
import { Habit } from '../types';
import { X, PauseCircle } from 'lucide-react';

interface Props {
  habit: Habit | null;
  currentVal: number;
  onClose: () => void;
  onSave: (val: number, status?: 'done' | 'skip') => void;
}

const ProgressModal: React.FC<Props> = ({ habit, currentVal, onClose, onSave }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    setVal(currentVal);
  }, [currentVal, habit]);

  if (!habit) return null;

  const remaining = Math.max(0, habit.goal - val);

  const adjust = (amount: number) => {
    setVal(prev => Math.max(0, prev + amount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-slide-up">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5">
          <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-white">{habit.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-primary mb-2 font-mono">{val}</div>
            <div className="text-slate-500 dark:text-slate-400 capitalize">{habit.unit}</div>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {[-10, -5, -1, 1, 5, 10].map(num => (
              <button
                key={num}
                onClick={() => adjust(num)}
                className="h-10 min-w-[40px] px-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-semibold text-sm hover:bg-primary hover:text-white hover:border-primary transition-colors text-slate-700 dark:text-slate-300"
              >
                {num > 0 ? '+' : ''}{num}
              </button>
            ))}
          </div>

          <div className="text-center p-4 bg-slate-100 dark:bg-white/5 rounded-xl">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hedef: <strong className="text-primary">{habit.goal}</strong> • Kalan: <strong className="text-primary">{remaining}</strong>
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-white/5 flex gap-3">
          <button 
            onClick={() => onSave(0, 'skip')}
            className="flex flex-col items-center justify-center w-20 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <PauseCircle size={20} className="mb-1" />
            Mola Ver
          </button>
          
          <button 
            onClick={() => onSave(val, 'done')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;

import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/axios.js';
import { AsyncButton } from './AsyncButton.jsx';
import { getErrorMessage } from '../lib/utils.js';

const SetSchema = z.object({
  reps_completed: z.number().int().min(0, 'Reps must be non-negative'),
  weight: z.number().min(0, 'Weight cannot be negative'),
});

const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets_completed: z.array(SetSchema).min(1, 'At least one set is required'),
});

const LogWorkoutSchema = z.object({
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  notes: z.string().optional(),
  exercises: z.array(ExerciseSchema).min(1, 'At least one exercise is required'),
});

// Extracted into its own component so useFieldArray is not called inside a map() — fixes the Rules of Hooks violation
function ExerciseFieldset({ exerciseIndex, exercise, control, register, errors, plannedExercise }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.sets_completed`,
  });

  return (
    <div className="bg-cyber-purple-900/40 p-5 sm:p-8 border-2 border-cyber-purple-700">
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4 sm:mb-6 font-sans">
        {exercise.name}
        {plannedExercise && (
          <span className="ml-3 sm:ml-4 text-xs sm:text-sm md:text-base font-normal text-gray-400 font-mono">
            (PLANNED: {plannedExercise.sets} × {plannedExercise.reps})
          </span>
        )}
      </h3>

      <div className="space-y-3 sm:space-y-4">
        {fields.map((set, setIndex) => (
          <div
            key={set.id}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-cyber-darker p-4 sm:p-5 border-2 border-cyber-purple-700"
          >
            <span className="font-bold text-cyber-purple-300 w-full sm:w-20 text-sm sm:text-base md:text-lg font-mono">
              SET {setIndex + 1}
            </span>

            <div className="flex-1 w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-mono">REPS COMPLETED</label>
                <input
                  type="number"
                  min="0"
                  {...register(
                    `exercises.${exerciseIndex}.sets_completed.${setIndex}.reps_completed`,
                    { valueAsNumber: true }
                  )}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-cyber-black border-2 border-cyber-purple-700 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono"
                />
                {errors.exercises?.[exerciseIndex]?.sets_completed?.[setIndex]?.reps_completed && (
                  <p className="text-cyber-red-400 text-xs mt-1 font-mono">
                    {errors.exercises[exerciseIndex].sets_completed[setIndex].reps_completed.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-2 font-mono">WEIGHT</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  {...register(
                    `exercises.${exerciseIndex}.sets_completed.${setIndex}.weight`,
                    { valueAsNumber: true }
                  )}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-cyber-black border-2 border-cyber-purple-700 text-cyber-cyan-100 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono"
                />
                {errors.exercises?.[exerciseIndex]?.sets_completed?.[setIndex]?.weight && (
                  <p className="text-cyber-red-400 text-xs mt-1 font-mono">
                    {errors.exercises[exerciseIndex].sets_completed[setIndex].weight.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(setIndex)}
              disabled={fields.length <= 1}
              className="p-2 sm:p-3 text-cyber-red-400 hover:text-cyber-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg sm:text-xl"
              aria-label="Remove set"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ reps_completed: 0, weight: 0 })}
        className="mt-5 sm:mt-6 inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-2 sm:py-3 text-cyber-purple-300 hover:text-white hover:bg-cyber-purple-800/50 transition-all font-semibold text-xs sm:text-sm md:text-base font-mono"
      >
        + ADD SET
      </button>
    </div>
  );
}

export function LogWorkoutModal({ day, planId, isOpen, onClose, onSuccess }) {
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(LogWorkoutSchema),
    defaultValues: {
      duration_minutes: 30,
      notes: '',
      exercises: [],
    },
  });

  const { fields: exerciseFields } = useFieldArray({
    control,
    name: 'exercises',
  });

  useEffect(() => {
    if (isOpen && day) {
      const initialExercises = (day.exercises || []).map((exercise) => ({
        name: exercise.name,
        sets_completed: Array.from({ length: exercise.sets }, () => ({
          reps_completed: 0,
          weight: 0,
        })),
      }));

      reset({
        duration_minutes: 30,
        notes: '',
        exercises: initialExercises,
      });

      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, day, reset]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const onSubmit = async (data) => {
    try {
      // Transform client shape → server shape:
      // server expects: sets_completed (count), reps_completed (array), weight (average)
      const exercises_completed = data.exercises.map((ex) => ({
        name: ex.name,
        sets_completed: ex.sets_completed.length,
        reps_completed: ex.sets_completed.map((s) => s.reps_completed),
        weight:
          ex.sets_completed.length > 0
            ? ex.sets_completed.reduce((acc, curr) => acc + curr.weight, 0) /
              ex.sets_completed.length
            : 0,
      }));

      await api.post('/logs', {
        plan_id: planId,
        day_label: day.day_label,
        duration_minutes: data.duration_minutes,
        notes: data.notes,
        exercises_completed,
      });

      onSuccess();
      onClose();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cyber-black/85"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="cyber-card bg-cyber-dark max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-cyber-purple-700 flex justify-between items-center sticky top-0 bg-cyber-dark/95 z-10">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyber-cyan-400 font-sans">
              LOG WORKOUT
            </h2>
            <p className="text-gray-400 mt-1 text-xs sm:text-sm md:text-base font-mono">{day?.day_label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-cyber-cyan-400 text-3xl sm:text-4xl font-mono"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-8 space-y-6 sm:space-y-8">
          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              DURATION (MINUTES)
            </label>
            <input
              ref={firstInputRef}
              type="number"
              min="1"
              {...register('duration_minutes', { valueAsNumber: true })}
              className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-cyber-darker border-2 text-cyber-cyan-100 placeholder-gray-500 focus:shadow-cyan-glow outline-none transition-all text-sm sm:text-base md:text-lg font-mono ${
                errors.duration_minutes
                  ? 'border-cyber-red-500'
                  : 'border-cyber-purple-700 focus:border-cyber-cyan-500'
              }`}
            />
            {errors.duration_minutes && (
              <p className="text-cyber-red-400 text-xs sm:text-sm mt-2 font-mono">
                {errors.duration_minutes.message}
              </p>
            )}
          </div>

          <div className="space-y-6 sm:space-y-8">
            {exerciseFields.map((exercise, exerciseIndex) => (
              <ExerciseFieldset
                key={exercise.id}
                exerciseIndex={exerciseIndex}
                exercise={exercise}
                control={control}
                register={register}
                errors={errors}
                plannedExercise={day?.exercises?.[exerciseIndex]}
              />
            ))}
          </div>

          <div>
            <label className="block text-xs sm:text-sm md:text-base font-semibold text-cyber-cyan-300 mb-2 sm:mb-3 font-mono">
              NOTES (OPTIONAL)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-cyber-darker border-2 border-cyber-purple-700 text-cyber-cyan-100 placeholder-gray-500 focus:shadow-cyan-glow outline-none transition-all text-xs sm:text-sm md:text-base font-mono"
              placeholder="HOW DID IT GO?"
            />
          </div>

          {errors.exercises && (
            <div className="bg-cyber-red-500/20 border-2 border-cyber-red-500 text-cyber-red-300 px-4 sm:px-5 py-3 text-xs sm:text-sm md:text-base font-mono">
              {errors.exercises.message || errors.exercises.root?.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-cyber-purple-700">
            <AsyncButton
              type="button"
              onClick={onClose}
              className="cyber-button px-6 sm:px-8 py-3 sm:py-4 border-2 border-cyber-purple-500 text-cyber-purple-200 hover:bg-cyber-purple-900/70 font-semibold text-xs sm:text-sm md:text-base font-mono"
            >
              CANCEL
            </AsyncButton>
            <AsyncButton
              type="submit"
              loading={isSubmitting}
              className="cyber-button px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyber-green-600 to-cyber-green-800 text-white hover:shadow-green-glow font-semibold text-xs sm:text-sm md:text-base font-mono"
            >
              SAVE WORKOUT
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}

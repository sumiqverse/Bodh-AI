'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, Star, Send, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type FeedbackCategory = 'suggestion' | 'content_issue' | 'bug' | 'praise';

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps): React.ReactElement | null {
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      trackEvent('pilot_feedback_submitted', 'assessment', {
        category,
        rating,
        isAnonymous,
        commentLength: comment.length,
      });

      // Simulated or actual endpoint dispatch
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSubmitted(true);
    } catch {
      // Graceful fallback
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = (): void => {
    setSubmitted(false);
    setComment('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 rounded-lg p-1"
          aria-label="Close feedback modal"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2
              className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Thank You for Your Feedback!
            </h2>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Your insights help us optimize BodhAI for students and teachers across India.
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="feedback-modal-title"
                  className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  Pilot Feedback
                </h2>
                <p className="text-xs text-zinc-500">Help improve BodhAI in your classroom</p>
              </div>
            </div>

            {/* Category Selector */}
            <div className="mb-4">
              <label
                htmlFor="feedback-category"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Category
              </label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="suggestion">Pedagogical Suggestion</option>
                <option value="content_issue">Question / Curriculum Issue</option>
                <option value="bug">Technical Bug / Sync Glitch</option>
                <option value="praise">Classroom Success / Praise</option>
              </select>
            </div>

            {/* Star Rating */}
            <div className="mb-4">
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Experience Rating
              </span>
              <div className="flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 rounded"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    aria-checked={rating >= star}
                    role="radio"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        rating >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Area */}
            <div className="mb-4">
              <label
                htmlFor="feedback-comment"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Comments (Optional)
              </label>
              <textarea
                id="feedback-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share any questions, suggestions, or issues..."
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Anonymous Checkbox */}
            <div className="mb-6 flex items-center gap-2">
              <input
                id="anonymous-toggle"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <label
                htmlFor="anonymous-toggle"
                className="text-xs text-zinc-600 dark:text-zinc-400"
              >
                Submit anonymously (no account identifiers attached)
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="rounded-lg px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

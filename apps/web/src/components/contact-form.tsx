'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button, Input, Select, Card, CardContent } from '@bodhai/ui';

export function ContactForm(): React.JSX.Element {
  const t = useTranslations('contact');

  const contactSchema = React.useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, { message: t('validationNameRequired') }),
        email: z
          .string()
          .trim()
          .email({ message: t('validationEmailInvalid') }),
        role: z.string().min(1, { message: t('validationRoleRequired') }),
        message: z
          .string()
          .trim()
          .min(10, { message: t('validationMessageLength') })
          .max(1000, { message: t('validationMessageLength') }),
        honeypot: z.string().max(0, { message: 'Bot submission detected.' }),
      }),
    [t],
  );

  type FormValues = z.infer<typeof contactSchema>;

  const [formValues, setFormValues] = React.useState<FormValues>({
    name: '',
    email: '',
    role: '',
    message: '',
    honeypot: '',
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [lastSubmitTime, setLastSubmitTime] = React.useState<number>(0);

  const roleOptions = [
    { value: 'student', label: t('roleStudent') },
    { value: 'teacher', label: t('roleTeacher') },
    { value: 'school', label: t('roleSchool') },
    { value: 'parent', label: t('roleParent') },
    { value: 'researcher', label: t('roleResearcher') },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrors({});
    setIsSuccess(false);

    // Rate Limiting Check (Placeholder / Defense: 1 submission per 10 seconds per client session)
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      setErrors({
        message: t('rateLimitNotice'),
      });
      return;
    }

    // Zod Validation
    const validationResult = contactSchema.safeParse(formValues);
    if (!validationResult.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // Simulate async submission
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSubmitting(false);
    setIsSuccess(true);
    setLastSubmitTime(now);
    setFormValues({
      name: '',
      email: '',
      role: '',
      message: '',
      honeypot: '',
    });
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-elevated border-border bg-card">
      <CardContent className="p-6 sm:p-8">
        {isSuccess ? (
          <div
            role="status"
            className="rounded-xl border border-success/40 bg-success/10 p-6 text-center text-foreground flex flex-col items-center gap-3 animate-fade-in"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground text-xl">
              ✓
            </span>
            <h3 className="text-lg font-bold text-success font-serif">Message Sent</h3>
            <p className="text-sm text-foreground/90 max-w-md leading-relaxed">
              {t('formSuccess')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSuccess(false)}
              className="mt-2"
            >
              Send Another Inquiry
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 text-left">
            {/* Honeypot Anti-Spam Field */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="contact-hp">{t('honeypotLabel')}</label>
              <input
                id="contact-hp"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formValues.honeypot}
                onChange={(e) => setFormValues((prev) => ({ ...prev, honeypot: e.target.value }))}
              />
            </div>

            {/* Name Field */}
            <Input
              id="contact-name"
              label={t('formName')}
              placeholder={t('formNamePlaceholder')}
              required
              value={formValues.name}
              error={errors.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
            />

            {/* Email Field */}
            <Input
              id="contact-email"
              type="email"
              label={t('formEmail')}
              placeholder={t('formEmailPlaceholder')}
              required
              value={formValues.email}
              error={errors.email}
              onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))}
            />

            {/* Role Select */}
            <Select
              id="contact-role"
              label={t('formRole')}
              placeholder={t('formRole')}
              required
              options={roleOptions}
              value={formValues.role}
              error={errors.role}
              onChange={(e) => setFormValues((prev) => ({ ...prev, role: e.target.value }))}
            />

            {/* Message Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
                {t('formMessage')}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="contact-message"
                rows={5}
                required
                value={formValues.message}
                placeholder={t('formMessagePlaceholder')}
                aria-invalid={Boolean(errors.message)}
                onChange={(e) => setFormValues((prev) => ({ ...prev, message: e.target.value }))}
                className={`flex w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
                  errors.message ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
              />
              {errors.message && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Rate limit note */}
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              🛡️ {t('rateLimitNotice')}
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="mt-2 w-full sm:w-auto self-start"
            >
              {isSubmitting ? t('formSubmitting') : t('formSubmit')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  buttonVariants,
  Input,
  Select,
  Badge,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { ConsentDetailResponse } from '@bodhai/api-client';

export default function ConsentPage(): React.JSX.Element {
  const t = useTranslations('consent');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [consents, setConsents] = React.useState<ConsentDetailResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Form state
  const [guardianName, setGuardianName] = React.useState<string>('');
  const [guardianPhone, setGuardianPhone] = React.useState<string>('');
  const [relationship, setRelationship] = React.useState<string>('mother');
  const [scopeDiagnostic, setScopeDiagnostic] = React.useState<boolean>(true);
  const [scopeLearning, setScopeLearning] = React.useState<boolean>(true);
  const [scopeDataSharing, setScopeDataSharing] = React.useState<boolean>(true);

  const fetchConsents = React.useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    const user = getCurrentUser();
    if (!token || !user) {
      router.push('/login');
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiClient.getStudentConsents(user.id, token);
      setConsents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load consents';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, router]);

  React.useEffect(() => {
    void fetchConsents();
  }, [fetchConsents]);

  const handleSubmitConsent = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const token = getAuthToken();
    const user = getCurrentUser();
    if (!token || !user) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = guardianName.trim();
    if (trimmedName.length < 2) {
      setErrorMessage(t('nameError'));
      return;
    }

    const cleanPhone = guardianPhone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      setErrorMessage(t('phoneError'));
      return;
    }

    const scopes: string[] = [];
    if (scopeDiagnostic) scopes.push('diagnostic');
    if (scopeLearning) scopes.push('learning');
    if (scopeDataSharing) scopes.push('data_sharing');

    if (scopes.length === 0) {
      setErrorMessage(t('scopeError'));
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.recordGuardianConsent(
        {
          student_id: user.id,
          guardian_name: trimmedName,
          guardian_phone: cleanPhone,
          guardian_relationship: relationship,
          version: '2024.1',
          scopes,
        },
        token,
      );

      const refreshed = await apiClient.getStudentConsents(user.id, token);
      setConsents(refreshed);
      setSuccessMessage(t('consentGrantedSuccess'));
      setGuardianName('');
      setGuardianPhone('');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Error registering consent';
      if (msg.includes('422') || msg.toLowerCase().includes('failed validation')) {
        const cleanDetail = msg.replace(/^API Error \[422\]:\s*/, '');
        msg = `${t('validationError')} (${cleanDetail})`;
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawConsent = async (consentId: string, scopeName?: string): Promise<void> => {
    const token = getAuthToken();
    const user = getCurrentUser();
    if (!token || !user) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setWithdrawingId(consentId);

    try {
      await apiClient.withdrawConsent(
        {
          student_id: user.id,
          scope: scopeName,
        },
        token,
      );

      const refreshed = await apiClient.getStudentConsents(user.id, token);
      setConsents(refreshed);
      setSuccessMessage(t('consentWithdrawnSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error withdrawing consent';
      setErrorMessage(msg);
    } finally {
      setWithdrawingId(null);
    }
  };

  const relationshipOptions = [
    { value: 'father', label: t('relFather') },
    { value: 'mother', label: t('relMother') },
    { value: 'legal_guardian', label: t('relLegalGuardian') },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/diagnostic"
            className={buttonVariants({
              variant: 'primary',
              size: 'md',
              className: 'cursor-pointer font-semibold shadow-elevated inline-flex items-center',
            })}
          >
            Continue to Diagnostic →
          </Link>
          <Link
            href="/student"
            className={buttonVariants({
              variant: 'outline',
              size: 'md',
              className: 'cursor-pointer font-semibold inline-flex items-center',
            })}
          >
            Student Home →
          </Link>
        </div>
      </div>

      {/* Statutory Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs sm:text-sm text-foreground/90">
        <p className="font-semibold text-primary">DPDP Act 2023 Statutory Compliance Notice</p>
        <p className="mt-1 text-muted-foreground">{t('notice')}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 font-medium"
        >
          {successMessage}
        </div>
      )}

      {/* Form: Record Consent */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('recordConsentButton')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitConsent} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="guardian-name"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t('guardianName')}
                </label>
                <Input
                  id="guardian-name"
                  required
                  minLength={2}
                  maxLength={150}
                  placeholder={t('guardianNamePlaceholder')}
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="guardian-phone"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t('guardianPhone')}
                </label>
                <Input
                  id="guardian-phone"
                  type="tel"
                  inputMode="tel"
                  required
                  maxLength={15}
                  placeholder={t('guardianPhonePlaceholder')}
                  value={guardianPhone}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^0-9+\s\-()]/g, '');
                    setGuardianPhone(filtered);
                  }}
                />
                <p className="text-[11px] text-muted-foreground">{t('phoneHelp')}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="guardian-rel"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('relationship')}
              </label>
              <Select
                id="guardian-rel"
                options={relationshipOptions}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('scopesTitle')}
              </span>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopeDiagnostic}
                    onChange={(e) => setScopeDiagnostic(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span>{t('scopeDiagnostic')}</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopeLearning}
                    onChange={(e) => setScopeLearning(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span>{t('scopeLearning')}</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopeDataSharing}
                    onChange={(e) => setScopeDataSharing(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span>{t('scopeDataSharing')}</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full cursor-pointer py-2.5 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('recording') : t('recordConsentButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Consents */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('activeConsentsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading consent history...
            </p>
          ) : consents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noConsents')}</p>
          ) : (
            <div className="space-y-3">
              {consents.map((item, index) => (
                <div
                  key={`${item.id}-${item.scope || index}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {item.guardian_name || 'Guardian'} ({item.guardian_relationship || 'Parent'}
                        ) •{' '}
                        <span className="font-mono text-xs uppercase text-primary">
                          {item.scope}
                        </span>
                      </span>
                      <Badge variant={item.is_granted ? 'success' : 'outline'} className="text-xs">
                        {item.is_granted ? t('statusGranted') : t('statusRevoked')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>
                        {t('versionLabel')} v{item.version} •{' '}
                      </span>
                      <span>
                        {t('timestampLabel')} {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {item.is_granted && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs text-destructive hover:bg-destructive/10 shrink-0"
                      disabled={withdrawingId === item.id}
                      onClick={() => handleWithdrawConsent(item.id, item.scope)}
                    >
                      {withdrawingId === item.id ? t('withdrawing') : t('withdrawConsentButton')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

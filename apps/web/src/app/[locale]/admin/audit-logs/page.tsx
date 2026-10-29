'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from '@bodhai/ui';
import { AdminNav } from '@/components/admin/AdminNav';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { AuditLogItemResponse, AuditLogListResponse } from '@bodhai/api-client';

const ACTIONS = [
  'all',
  'teacher_signup',
  'teacher_login',
  'consent_granted',
  'consent_withdrawn',
  'student_data_export',
  'student_data_delete',
  'retention_cleanup',
] as const;

export default function AdminAuditLogsPage(): React.JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [logsResponse, setLogsResponse] = React.useState<AuditLogListResponse | null>(null);
  const [selectedAction, setSelectedAction] = React.useState<string>('all');
  const [page, setPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [activeDiffItem, setActiveDiffItem] = React.useState<AuditLogItemResponse | null>(null);

  const PAGE_SIZE = 20;

  const fetchLogs = React.useCallback(
    (actionFilter: string, pageNum: number) => {
      const user = getCurrentUser();
      const token = getAuthToken();
      if (!user || !token) {
        router.push('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.push('/classes');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const offset = (pageNum - 1) * PAGE_SIZE;
      const params = {
        action: actionFilter === 'all' ? undefined : actionFilter,
        limit: PAGE_SIZE,
        offset,
      };

      apiClient
        .getAuditLogs(params, token)
        .then((data) => setLogsResponse(data))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Error fetching audit logs';
          setErrorMessage(msg);
        })
        .finally(() => setIsLoading(false));
    },
    [apiClient, router],
  );

  React.useEffect(() => {
    fetchLogs(selectedAction, page);
  }, [fetchLogs, selectedAction, page]);

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAction(e.target.value);
    setPage(1);
  };

  const totalPages = logsResponse ? Math.max(1, Math.ceil(logsResponse.total / PAGE_SIZE)) : 1;

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete') || action.includes('withdrawn')) {
      return 'destructive';
    }
    if (action.includes('granted') || action.includes('export')) {
      return 'default';
    }
    return 'outline';
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auditLogsTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('auditLogsSubtitle')}</p>
        </div>

        <div>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary font-mono text-xs"
          >
            DPDP IMMUTABLE LOG
          </Badge>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
        <label htmlFor="action-filter" className="text-sm font-semibold text-foreground shrink-0">
          {t('filterAction')}:
        </label>
        <select
          id="action-filter"
          value={selectedAction}
          onChange={handleActionChange}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
        >
          {ACTIONS.map((act) => (
            <option key={act} value={act}>
              {act === 'all' ? t('allActions') : act}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Audit Events</CardTitle>
            {logsResponse && (
              <span className="text-xs text-muted-foreground font-mono">
                {t('pageIndicator', { page, totalPages, total: logsResponse.total })}
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Append-only verification records conforming with ISO 27001 and DPDP Act Chapter III
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('loadingLogs')}
            </div>
          ) : !logsResponse || logsResponse.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('noLogs')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      {t('timestampCol')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('actionCol')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('resourceCol')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('userCol')}
                    </th>
                    <th scope="col" className="px-4 py-3">
                      {t('ipCol')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {t('detailsCol')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsResponse.items.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={getActionBadgeVariant(log.action)}
                          className="font-mono text-xs"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <span className="font-medium text-foreground">{log.resource_type}</span>
                        <span className="text-muted-foreground ml-1 font-mono">
                          ({log.resource_id.substring(0, 8)}...)
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.user_id ? `${log.user_id.substring(0, 8)}...` : 'System'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.ip_address ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveDiffItem(log)}
                          aria-label={`View diff for audit event ${log.id}`}
                          className="h-7 text-xs font-mono"
                        >
                          {t('viewChanges')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="text-xs"
            >
              ← {t('previousPage')}
            </Button>
            <span className="text-xs text-muted-foreground font-mono">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="text-xs"
            >
              {t('nextPage')} →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Diff Inspection Modal */}
      {activeDiffItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-diff-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 id="audit-diff-title" className="font-serif text-lg font-bold">
                  Audit Event Details
                </h2>
                <p className="text-xs text-muted-foreground font-mono">{activeDiffItem.id}</p>
              </div>
              <Badge
                variant={getActionBadgeVariant(activeDiffItem.action)}
                className="font-mono text-xs"
              >
                {activeDiffItem.action}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="text-muted-foreground">Resource: </span>
                <span className="font-mono text-foreground">
                  {activeDiffItem.resource_type} ({activeDiffItem.resource_id})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Client IP: </span>
                <span className="font-mono text-foreground">
                  {activeDiffItem.ip_address ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">User ID: </span>
                <span className="font-mono text-foreground">
                  {activeDiffItem.user_id ?? 'System'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Timestamp: </span>
                <span className="font-mono text-foreground">
                  {new Date(activeDiffItem.created_at).toISOString()}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="diff-json-view"
                className="text-xs font-semibold text-muted-foreground block mb-1"
              >
                Recorded Changes & Payloads (JSON):
              </label>
              <pre
                id="diff-json-view"
                className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto max-h-60 text-foreground"
              >
                {JSON.stringify(activeDiffItem.changes, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDiffItem(null)}
                className="text-xs"
              >
                {t('closeChanges')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

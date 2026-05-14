export function getHttpErrorMessage(err: any, fallback: string): string {
  const detail = err?.error?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => {
        const field = Array.isArray(e?.loc) ? e.loc.join('.') : 'campo';
        return `${field}: ${e?.msg ?? 'Dato inválido'}`;
      })
      .join(' | ');
  }

  if (typeof detail === 'string') {
    return detail;
  }

  return `${fallback}${err?.status ? ` Código: ${err.status}` : ''}`;
}

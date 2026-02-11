import { canAccessResource } from '@alea/spec';
import { Action, ResourceName } from '@alea/utils';
import { useQuery } from '@tanstack/react-query';

export function variablesToQueryKey(
  variables?: Record<string, string>
): [string, string][] {
  if (!variables) return [];
  return Object.entries(variables).sort(([a], [b]) =>
    a.localeCompare(b)
  );
}
export function useCheckAccess({
  resource,
  action,
  variables = {},
}: {
  resource: ResourceName;
  action: Action;
  variables?: Record<string, string>;
}) {
  const variablesKey = variablesToQueryKey(variables);

  return useQuery({
    queryKey: ['can-access', resource, action, ...variablesKey],
    queryFn: () => canAccessResource(resource, action, variables),
    enabled: Boolean(resource && action),
  });
}

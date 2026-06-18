export type AdminViewStateKind =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'validation-error'
  | 'permission-error'
  | 'conflict-error'
  | 'upload-error'
  | 'storage-error'
  | 'unexpected-error';

export interface HallDestination {
  readonly id: 'kiosk' | 'admin';
  readonly label: string;
  readonly route: string;
  readonly description: string;
}

export interface AdminSection {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly summary: string;
  readonly status?: 'ready' | 'warning' | 'blocked';
}

export interface AdminListState<T> {
  readonly state: AdminViewStateKind;
  readonly rows: readonly T[];
  readonly message?: string;
}

export interface AdminFormState<T> {
  readonly state: AdminViewStateKind;
  readonly value: T;
  readonly dirty: boolean;
  readonly message?: string;
}

export interface ApplicationErrorContract {
  readonly code: string;
  readonly message: string;
  readonly category:
    | 'validation'
    | 'permission'
    | 'dependency'
    | 'upload'
    | 'storage'
    | 'migration'
    | 'not-found'
    | 'conflict'
    | 'unexpected';
  readonly correlationId?: string;
}

export interface DataMigrationDecision {
  readonly path: 'structural-migration' | 'compatibility-validation';
  readonly reason: string;
  readonly validationArtifact: string;
}

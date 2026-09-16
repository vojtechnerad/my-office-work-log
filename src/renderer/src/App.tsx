import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckSquare2,
  ChevronRight,
  Clock3,
  Database,
  FilePlus2,
  LayoutDashboard,
  ListFilter,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Sun,
  Trash2
} from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type {
  DatabaseFile,
  DatabaseMetadata,
  ReferenceMutation,
  ReminderSettings,
  SaveEntryRequest,
  WorkspaceAccount,
  WorkspaceActivityType,
  WorkspaceChecklistDefinition,
  WorkspaceCustomer,
  WorkspaceEntry,
  WorkspaceSnapshot
} from '../../shared/ipc'
import {
  calculateDashboard,
  filterWorkEntries,
  type WorkEntryFilters
} from '../../shared/work-report'
import {
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Label,
  Select,
  Switch,
  Textarea
} from './components/ui'
import { activateLanguage, useT, type Translate } from './i18n'

type View =
  'dashboard' | 'entries' | 'customers' | 'accounts' | 'activities' | 'checklists' | 'settings'
type EntryKind = 'filler' | 'work'
const emptyWorkspace: WorkspaceSnapshot = {
  accounts: [],
  activityTypes: [],
  checklistDefinitions: [],
  customers: [],
  days: [],
  entries: []
}
const today = (): string => new Date().toISOString().slice(0, 10)
const formatDuration = (minutes: number): string =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

function localizedError(error: unknown, translate: Translate): string {
  const code = error instanceof Error ? error.message : ''
  const messages: Record<string, Parameters<Translate>[0]> = {
    'database-not-open': 'error.databaseNotOpen',
    'work-day-confirmed-locked': 'error.workDayConfirmed',
    'work-day-empty': 'error.workDayEmpty',
    'work-day-overlaps': 'error.workDayOverlaps'
  }
  return translate(messages[code] ?? 'error.generic')
}

function Startup({ onOpen }: { onOpen: (metadata: DatabaseMetadata) => void }): React.JSX.Element {
  const t = useT()
  const [databases, setDatabases] = useState<DatabaseFile[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void window.mowl.database
      .list()
      .then((registry) => setDatabases(registry.databases))
      .catch((caught) => setError(localizedError(caught, t)))
      .finally(() => setLoading(false))
  }, [])
  async function open(database: DatabaseFile): Promise<void> {
    try {
      onOpen(await window.mowl.database.open({ filePath: database.filePath }))
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    try {
      onOpen(
        await window.mowl.database.create({
          displayName: String(data.get('name')),
          description: String(data.get('description')),
          fileName: String(data.get('fileName')) || undefined
        })
      )
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  async function locate(item: DatabaseFile): Promise<void> {
    try {
      const metadata = await window.mowl.database.locate({ missingFilePath: item.filePath })
      if (metadata) onOpen(metadata)
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  async function remove(item: DatabaseFile): Promise<void> {
    await window.mowl.database.remove({ filePath: item.filePath })
    setDatabases((current) => current.filter((candidate) => candidate.filePath !== item.filePath))
  }
  return (
    <main className="startup-shell">
      <section className="startup-panel">
        <Brand />
        <div className="startup-heading">
          <p className="eyebrow">{t('database.workspace')}</p>
          <h1>{t('database.startTitle')}</h1>
          <p>{t('database.startDetail')}</p>
        </div>
        {error && <div className="notice error">{error}</div>}
        <div className="database-list">
          {loading && <p className="empty-state">{t('database.loading')}</p>}
          {!loading && databases.length === 0 && (
            <p className="empty-state">{t('database.empty')}</p>
          )}
          {databases.map((item) => (
            <div className={`database-row ${item.status}`} key={item.filePath}>
              <span className="database-icon">
                <Database size={19} />
              </span>
              <span>
                <strong>{item.displayName}</strong>
                <small>{item.description || item.filePath}</small>
              </span>
              <Badge tone={item.status === 'available' ? 'green' : 'red'}>
                {t(`database.status.${item.status}`)}
              </Badge>
              {item.status === 'available' ? (
                <Button
                  aria-label={t('database.open', { name: item.displayName })}
                  onClick={() => void open(item)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRight size={17} />
                </Button>
              ) : (
                <span className="database-actions">
                  <Button onClick={() => void locate(item)} size="sm" variant="outline">
                    {t('database.locate')}
                  </Button>
                  <Button
                    aria-label={t('database.remove')}
                    onClick={() => void remove(item)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 size={15} />
                  </Button>
                </span>
              )}
            </div>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <FilePlus2 size={16} />
          {t('database.new')}
        </Button>
      </section>
      <Dialog
        onOpenChange={setCreateOpen}
        open={createOpen}
        title={t('database.create')}
        description={t('database.createDetail')}
      >
        <form className="form-stack" onSubmit={(event) => void create(event)}>
          <Field label={t('common.name')}>
            <Input autoFocus name="name" required />
          </Field>
          <Field label={t('common.description')}>
            <Textarea name="description" />
          </Field>
          <Field label={t('database.fileName')}>
            <Input name="fileName" placeholder={t('database.fileNamePlaceholder')} />
          </Field>
          <div className="dialog-actions">
            <Button type="submit">{t('common.create')}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  )
}

function Brand({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const t = useT()
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <span className="brand-mark">M</span>
      <div>
        <strong>MOWL</strong>
        <small>{t('app.subtitle')}</small>
      </div>
    </div>
  )
}
function Status({ status }: { status: 'confirmed' | 'draft' }): React.JSX.Element {
  const t = useT()
  return (
    <Badge tone={status === 'confirmed' ? 'green' : 'neutral'}>
      {status === 'confirmed' ? t('common.confirmed') : t('day.draft')}
    </Badge>
  )
}
function Stat({
  detail,
  icon,
  label,
  value
}: {
  detail?: string
  icon: ReactNode
  label: string
  value: string
}): React.JSX.Element {
  return (
    <div className="stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  )
}

function EntryTable({
  entries,
  onEdit,
  snapshot
}: {
  entries: WorkspaceEntry[]
  onEdit: (entry: WorkspaceEntry) => void
  snapshot: WorkspaceSnapshot
}): React.JSX.Element {
  const t = useT()
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('common.date')}</th>
            <th>{t('common.time')}</th>
            <th>{t('entry.table.account')}</th>
            <th>{t('common.activity')}</th>
            <th>{t('common.ticket')}</th>
            <th>{t('common.description')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={7}>
                {t('entry.empty')}
              </td>
            </tr>
          )}
          {entries.map((entry) => {
            const account = snapshot.accounts.find((item) => item.id === entry.accountId)
            const customer = snapshot.customers.find((item) => item.id === account?.customerId)
            const activity = snapshot.activityTypes.find((item) => item.id === entry.activityTypeId)
            return (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td className="nowrap">
                  {entry.startTime}–{entry.endTime}
                </td>
                <td>
                  <span className="color-label">
                    <i style={{ background: customer?.color ?? '#8a8a8a' }} />
                    {account ? `${customer?.name} / ${account.code}` : t('common.filler')}
                  </span>
                </td>
                <td>
                  <span className="color-label">
                    <i style={{ background: activity?.color ?? '#8a8a8a' }} />
                    {activity?.name ?? '—'}
                  </span>
                </td>
                <td>{entry.ticketNumber ?? '—'}</td>
                <td className="description-cell">{entry.description || '—'}</td>
                <td>
                  <Button
                    aria-label={t('common.edit')}
                    onClick={() => onEdit(entry)}
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil size={15} />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EntryEditor({
  entry,
  kind,
  onClose,
  reload,
  snapshot
}: {
  entry?: WorkspaceEntry
  kind: EntryKind
  onClose: () => void
  reload: () => Promise<void>
  snapshot: WorkspaceSnapshot
}): React.JSX.Element {
  const t = useT()
  const [form, setForm] = useState<SaveEntryRequest>({
    id: entry?.id,
    accountId: entry?.accountId ?? null,
    activityTypeId: entry?.activityTypeId ?? null,
    date: entry?.date ?? today(),
    startTime: entry?.startTime ?? '09:00',
    endTime: entry?.endTime ?? '09:30',
    ticketNumber: entry?.ticketNumber ?? '',
    description: entry?.description ?? ''
  })
  const [error, setError] = useState('')
  const locked = snapshot.days.find((day) => day.date === entry?.date)?.status === 'confirmed'
  const account = snapshot.accounts.find((item) => item.id === form.accountId)
  const definitions = snapshot.checklistDefinitions.filter(
    (definition) =>
      definition.customerId === account?.customerId &&
      (definition.isActive ||
        entry?.checklistValues.some(
          (value) => value.checklistDefinitionId === definition.id && value.isChecked
        ))
  )
  const update = <Key extends keyof SaveEntryRequest>(
    key: Key,
    value: SaveEntryRequest[Key]
  ): void => setForm((current) => ({ ...current, [key]: value }))
  async function save(event: FormEvent): Promise<void> {
    event.preventDefault()
    try {
      await window.mowl.workspace.saveEntry({
        ...form,
        accountId: kind === 'filler' ? null : form.accountId
      })
      await reload()
      onClose()
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  async function check(id: number, isChecked: boolean): Promise<void> {
    if (!entry) return
    await window.mowl.workspace.setChecklistValue({
      checklistDefinitionId: id,
      isChecked,
      workEntryId: entry.id
    })
    await reload()
  }
  async function remove(): Promise<void> {
    if (!entry || !window.confirm(t('editor.deleteConfirm'))) return
    await window.mowl.workspace.deleteEntry({ id: entry.id })
    await reload()
    onClose()
  }
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open
      title={entry ? t('editor.edit') : kind === 'work' ? t('editor.newWork') : t('editor.newFiller')}
      description={locked ? t('editor.locked') : undefined}
    >
      <form className="editor-form" onSubmit={(event) => void save(event)}>
        {error && <div className="notice error">{error}</div>}
        <div className="form-grid three">
          <Field label={t('common.date')}>
            <Input
              disabled={locked}
              onChange={(event) => update('date', event.target.value)}
              required
              type="date"
              value={form.date}
            />
          </Field>
          <Field label={t('common.start')}>
            <Input
              disabled={locked}
              onChange={(event) => update('startTime', event.target.value)}
              required
              type="time"
              value={form.startTime}
            />
          </Field>
          <Field label={t('common.end')}>
            <Input
              disabled={locked}
              onChange={(event) => update('endTime', event.target.value)}
              required
              type="time"
              value={form.endTime}
            />
          </Field>
        </div>
        {kind === 'work' ? (
          <div className="form-grid two">
            <Field label={t('common.account')}>
              <Select
                onChange={(event) => update('accountId', Number(event.target.value) || null)}
                required
                value={form.accountId ?? ''}
              >
                <option value="">{t('common.select')}</option>
                {snapshot.accounts
                  .filter((item) => item.isActive || item.id === entry?.accountId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t('common.activity')}>
              <Select
                onChange={(event) => update('activityTypeId', Number(event.target.value) || null)}
                value={form.activityTypeId ?? ''}
              >
                <option value="">{t('common.none')}</option>
                {snapshot.activityTypes
                  .filter(
                    (item) =>
                      item.category === 'work' &&
                      (item.isActive || item.id === entry?.activityTypeId)
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        ) : (
          <Field label={t('editor.fillerActivity')}>
            <Select
              onChange={(event) => update('activityTypeId', Number(event.target.value) || null)}
              required
              value={form.activityTypeId ?? ''}
            >
              <option value="">{t('common.select')}</option>
              {snapshot.activityTypes
                .filter((item) => item.category === 'filler' && item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        {kind === 'work' && (
          <Field label={t('common.ticket')}>
            <Input
              onChange={(event) => update('ticketNumber', event.target.value)}
              value={form.ticketNumber ?? ''}
            />
          </Field>
        )}
        <Field label={t('common.description')}>
          <Textarea
            onChange={(event) => update('description', event.target.value)}
            value={form.description ?? ''}
          />
        </Field>
        {entry && kind === 'work' && definitions.length > 0 && (
          <section className="checklist-editor">
            <h3>{t('checklist.customer')}</h3>
            {definitions.map((definition) => {
              const checked = entry.checklistValues.some(
                (value) => value.checklistDefinitionId === definition.id && value.isChecked
              )
              return (
                <Label className="check-row" key={definition.id}>
                  <input
                    checked={checked}
                    onChange={(event) => void check(definition.id, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{definition.name}</span>
                  {!definition.isActive && <Badge>{t('checklist.archived')}</Badge>}
                </Label>
              )
            })}
          </section>
        )}
        <div className="dialog-actions split-actions">
          {entry && (
            <Button
              disabled={locked}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              <Trash2 size={15} />
              {t('common.delete')}
            </Button>
          )}
          <Button type="submit">{t('editor.save')}</Button>
        </div>
      </form>
    </Dialog>
  )
}

function RowActions({
  entity,
  id,
  reload
}: {
  entity: 'account' | 'activity' | 'checklist' | 'customer'
  id: number
  reload: () => Promise<void>
}): React.JSX.Element {
  const t = useT()
  async function run(action: 'deactivate' | 'delete'): Promise<void> {
    try {
      await window.mowl.workspace.mutateReference({ action, entity, id })
      await reload()
    } catch (caught) {
      window.alert(localizedError(caught, t))
    }
  }
  return (
    <span className="row-actions">
      <Button
        aria-label={t('common.deactivate')}
        onClick={() => void run('deactivate')}
        size="icon"
        title={t('common.deactivate')}
        variant="ghost"
      >
        <RotateCcw size={15} />
      </Button>
      <Button
        aria-label={t('common.delete')}
        onClick={() => void run('delete')}
        size="icon"
        title={t('common.delete')}
        variant="ghost"
      >
        <Trash2 size={15} />
      </Button>
    </span>
  )
}

function ManagementRow({
  active,
  children,
  color,
  meta,
  name
}: {
  active: boolean
  children: ReactNode
  color?: string | null
  meta: string
  name: ReactNode
}): React.JSX.Element {
  const t = useT()
  return (
    <div className="management-row">
      <span className="management-symbol" style={{ background: color ?? undefined }}>
        {color ? '' : <CheckSquare2 size={15} />}
      </span>
      <div className="management-copy">
        <strong>{name}</strong>
        <small>{meta}</small>
      </div>
      {!active && <Badge>{t('common.inactive')}</Badge>}
      {children}
    </div>
  )
}
function AddForm({
  children,
  submit
}: {
  children: ReactNode
  submit: (data: FormData) => Promise<void>
}): React.JSX.Element {
  const t = useT()
  return (
    <form
      className="management-form"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        void submit(new FormData(form)).then(() => form.reset())
      }}
    >
      {children}
      <Button size="sm" type="submit">
        <Plus size={14} />
        {t('common.add')}
      </Button>
    </form>
  )
}

function Management({
  reload,
  snapshot,
  type
}: {
  reload: () => Promise<void>
  snapshot: WorkspaceSnapshot
  type: 'accounts' | 'activities' | 'checklists' | 'customers'
}): React.JSX.Element {
  const t = useT()
  const [editing, setEditing] = useState<
    WorkspaceAccount | WorkspaceActivityType | WorkspaceCustomer | null
  >(null)
  const info = {
    customers: [t('nav.customers'), t('reference.customerDetail')],
    accounts: [t('nav.accounts'), t('reference.accountDetail')],
    activities: [t('nav.activities'), t('reference.activityDetail')],
    checklists: [t('checklist.title'), t('entry.listDetail')]
  }[type]
  async function create(request: ReferenceMutation): Promise<void> {
    await window.mowl.workspace.mutateReference(request)
    await reload()
  }
  return (
    <section className="content-view">
      <PageHeading eyebrow={t('reference.referenceData')} title={info[0]}>
        {info[1]}
      </PageHeading>
      {type === 'customers' && (
        <>
          <AddForm
            submit={(data) =>
              create({
                action: 'create',
                entity: 'customer',
                value: { name: String(data.get('name')), color: String(data.get('color')) }
              })
            }
          >
            <Input name="name" placeholder={t('common.customer')} required />
            <Input className="color-input" defaultValue="#111111" name="color" type="color" />
          </AddForm>
          <div className="management-list">
            {snapshot.customers.map((item) => (
              <ManagementRow
                active={item.isActive}
                color={item.color}
                key={item.id}
                meta={t('common.customer')}
                name={item.name}
              >
                <Button
                  aria-label={t('common.edit')}
                  onClick={() => setEditing(item)}
                  size="icon"
                  variant="ghost"
                >
                  <Pencil size={15} />
                </Button>
                <RowActions entity="customer" id={item.id} reload={reload} />
              </ManagementRow>
            ))}
          </div>
        </>
      )}
      {type === 'accounts' && (
        <>
          <AddForm
            submit={(data) =>
              create({
                action: 'create',
                entity: 'account',
                value: {
                  customerId: Number(data.get('customer')),
                  code: String(data.get('code')),
                  name: String(data.get('name')),
                  activeFrom: String(data.get('from')),
                  activeUntil: String(data.get('until')) || null
                }
              })
            }
          >
            <Select name="customer" required>
              <option value="">{t('common.customer')}</option>
              {snapshot.customers
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <Input name="code" placeholder={t('common.code')} required />
            <Input name="name" placeholder={t('common.account')} required />
            <Input name="from" required type="date" />
            <Input name="until" type="date" />
          </AddForm>
          <div className="management-list">
            {snapshot.accounts.map((item) => (
              <ManagementRow
                active={item.isActive}
                key={item.id}
                meta={`${snapshot.customers.find((customer) => customer.id === item.customerId)?.name} · ${item.activeFrom}`}
                name={`${item.code} · ${item.name}`}
              >
                <Button
                  aria-label={t('common.edit')}
                  onClick={() => setEditing(item)}
                  size="icon"
                  variant="ghost"
                >
                  <Pencil size={15} />
                </Button>
                <RowActions entity="account" id={item.id} reload={reload} />
              </ManagementRow>
            ))}
          </div>
        </>
      )}
      {type === 'activities' && (
        <>
          <AddForm
            submit={(data) =>
              create({
                action: 'create',
                entity: 'activity',
                value: {
                  category: String(data.get('category')) as 'work' | 'filler',
                  name: String(data.get('name')),
                  color: String(data.get('color')),
                  sortOrder: Number(data.get('order'))
                }
              })
            }
          >
            <Select name="category">
              <option value="work">{t('common.work')}</option>
              <option value="filler">{t('common.filler')}</option>
            </Select>
            <Input name="name" placeholder={t('activity.name')} required />
            <Input className="color-input" defaultValue="#333333" name="color" type="color" />
            <Input defaultValue="0" min="0" name="order" type="number" />
          </AddForm>
          <div className="management-list">
            {snapshot.activityTypes.map((item) => (
              <ManagementRow
                active={item.isActive}
                color={item.color}
                key={item.id}
                meta={`${item.category === 'work' ? t('work.work') : t('work.filler')} · ${t('reference.sortOrder')} ${item.sortOrder}`}
                name={item.name}
              >
                <Button
                  aria-label={t('common.edit')}
                  onClick={() => setEditing(item)}
                  size="icon"
                  variant="ghost"
                >
                  <Pencil size={15} />
                </Button>
                <RowActions entity="activity" id={item.id} reload={reload} />
              </ManagementRow>
            ))}
          </div>
        </>
      )}
      {type === 'checklists' && (
        <>
          <AddForm
            submit={(data) =>
              create({
                action: 'create',
                entity: 'checklist',
                value: {
                  customerId: Number(data.get('customer')),
                  name: String(data.get('name')),
                  sortOrder: Number(data.get('order'))
                }
              })
            }
          >
            <Select name="customer" required>
              <option value="">{t('common.customer')}</option>
              {snapshot.customers
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <Input name="name" placeholder={t('checklist.item')} required />
            <Input defaultValue="0" min="0" name="order" type="number" />
          </AddForm>
          <div className="management-list">
            {snapshot.checklistDefinitions.map((item) => (
              <ChecklistRow definition={item} key={item.id} reload={reload} snapshot={snapshot} />
            ))}
          </div>
        </>
      )}
      {editing && (
        <ReferenceEditor
          item={editing}
          onClose={() => setEditing(null)}
          reload={reload}
          snapshot={snapshot}
        />
      )}
    </section>
  )
}

function ReferenceEditor({
  item,
  onClose,
  reload,
  snapshot
}: {
  item: WorkspaceAccount | WorkspaceActivityType | WorkspaceCustomer
  onClose: () => void
  reload: () => Promise<void>
  snapshot: WorkspaceSnapshot
}): React.JSX.Element {
  const t = useT()
  const isAccount = 'code' in item,
    isActivity = 'category' in item
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    let request: ReferenceMutation
    if (isAccount)
      request = {
        action: 'update',
        entity: 'account',
        id: item.id,
        value: {
          customerId: Number(data.get('customer')),
          code: String(data.get('code')),
          name: String(data.get('name')),
          activeFrom: String(data.get('from')),
          activeUntil: String(data.get('until')) || null
        }
      }
    else if (isActivity)
      request = {
        action: 'update',
        entity: 'activity',
        id: item.id,
        value: {
          category: item.category,
          name: String(data.get('name')),
          color: String(data.get('color')),
          sortOrder: Number(data.get('order'))
        }
      }
    else
      request = {
        action: 'update',
        entity: 'customer',
        id: item.id,
        value: { name: String(data.get('name')), color: String(data.get('color')) || null }
      }
    await window.mowl.workspace.mutateReference(request)
    await reload()
    onClose()
  }
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open title={t('reference.edit')}>
      <form className="form-stack" onSubmit={(event) => void save(event)}>
        {isAccount && (
          <Field label={t('common.customer')}>
            <Select defaultValue={item.customerId} name="customer">
              {snapshot.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t('common.name')}>
          <Input defaultValue={item.name} name="name" required />
        </Field>
        {isAccount && (
          <>
            <Field label={t('common.code')}>
              <Input defaultValue={item.code} name="code" required />
            </Field>
            <div className="form-grid two">
              <Field label={t('common.activeFrom')}>
                <Input defaultValue={item.activeFrom} name="from" type="date" />
              </Field>
              <Field label={t('common.activeUntil')}>
                <Input defaultValue={item.activeUntil ?? ''} name="until" type="date" />
              </Field>
            </div>
          </>
        )}
        {isActivity && (
          <>
            <Field label={t('common.color')}>
              <Input defaultValue={item.color} name="color" type="color" />
            </Field>
            <Field label={t('reference.sortOrder')}>
              <Input defaultValue={item.sortOrder} name="order" type="number" />
            </Field>
          </>
        )}
        {!isAccount && !isActivity && (
          <Field label={t('common.color')}>
            <Input defaultValue={item.color ?? '#111111'} name="color" type="color" />
          </Field>
        )}
        <div className="dialog-actions">
          <Button type="submit">{t('common.saveChanges')}</Button>
        </div>
      </form>
    </Dialog>
  )
}

function ChecklistRow({
  definition,
  reload,
  snapshot
}: {
  definition: WorkspaceChecklistDefinition
  reload: () => Promise<void>
  snapshot: WorkspaceSnapshot
}): React.JSX.Element {
  const t = useT()
  const [name, setName] = useState(definition.name)
  async function save(): Promise<void> {
    await window.mowl.workspace.mutateReference({
      action: 'update',
      entity: 'checklist',
      id: definition.id,
      value: { name, sortOrder: definition.sortOrder }
    })
    await reload()
  }
  return (
    <ManagementRow
      active={definition.isActive}
      key={definition.id}
      meta={snapshot.customers.find((item) => item.id === definition.customerId)?.name ?? t('common.unknown')}
      name={
        <Input
          aria-label={t('checklist.item')}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      }
    >
      <Button
        aria-label={t('common.save')}
        disabled={name === definition.name}
        onClick={() => void save()}
        size="icon"
        variant="ghost"
      >
        <Pencil size={15} />
      </Button>
      <RowActions entity="checklist" id={definition.id} reload={reload} />
    </ManagementRow>
  )
}

function PageHeading({
  children,
  eyebrow,
  title
}: {
  children: ReactNode
  eyebrow: string
  title: string
}): React.JSX.Element {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </div>
  )
}

function StatePanel({
  children,
  icon,
  title
}: {
  children: ReactNode
  icon: ReactNode
  title: string
}): React.JSX.Element {
  return (
    <section className="state-panel">
      <span>{icon}</span>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function SettingsView({
  dark,
  reminderSettings,
  setDark,
  updateReminderSettings
}: {
  dark: boolean
  reminderSettings: ReminderSettings
  setDark: (value: boolean) => void
  updateReminderSettings: (settings: Partial<ReminderSettings>) => Promise<void>
}): React.JSX.Element {
  const t = useT()
  return (
    <section className="content-view">
      <PageHeading eyebrow={t('nav.settings')} title={t('settings.title')}>
        {t('settings.titleDetail')}
      </PageHeading>
      <div className="settings-group">
        <h2>{t('settings.appearance')}</h2>
        <div className="setting-row">
          <span>{dark ? <Moon size={18} /> : <Sun size={18} />}</span>
          <div>
            <strong>{t('settings.darkTheme')}</strong>
            <small>{t('settings.darkThemeDetail')}</small>
          </div>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>
        <div className="setting-row">
          <span />
          <div>
            <strong>{t('settings.language')}</strong>
            <small>{t('settings.languageDetail')}</small>
          </div>
          <Select
            onChange={(event) =>
              void updateReminderSettings({
                language: event.target.value as ReminderSettings['language']
              })
            }
            value={reminderSettings.language}
          >
            <option value="en">{t('language.en')}</option>
            <option value="cs">{t('language.cs')}</option>
          </Select>
        </div>
      </div>
      <div className="settings-group">
        <h2>{t('settings.reminders')}</h2>
        <div className="setting-row">
          <span>
            <Clock3 size={18} />
          </span>
          <div>
            <strong>{t('settings.workHourReminders')}</strong>
            <small>{t('settings.reminderDetail')}</small>
          </div>
          <Switch
            checked={reminderSettings.enabled}
            onCheckedChange={(enabled) => void updateReminderSettings({ enabled })}
          />
        </div>
        <div className="setting-row">
          <span />
          <div>
            <strong>{t('settings.interval')}</strong>
            <small>{t('settings.intervalDetail')}</small>
          </div>
          <Select
            disabled={!reminderSettings.enabled}
            onChange={(event) =>
              void updateReminderSettings({
                intervalMinutes: Number(event.target.value) as ReminderSettings['intervalMinutes']
              })
            }
            value={reminderSettings.intervalMinutes}
          >
            <option value="15">{t('settings.interval.15')}</option>
            <option value="30">{t('settings.interval.30')}</option>
            <option value="60">{t('settings.interval.60')}</option>
            <option value="120">{t('settings.interval.120')}</option>
          </Select>
        </div>
      </div>
    </section>
  )
}

function Workspace({
  metadata,
  close
}: {
  metadata: DatabaseMetadata
  close: () => void
}): React.JSX.Element {
  const t = useT()
  const [snapshot, setSnapshot] = useState(emptyWorkspace),
    [view, setView] = useState<View>('dashboard'),
    [date, setDate] = useState(today()),
    [filters, setFilters] = useState<WorkEntryFilters>({}),
    [editor, setEditor] = useState<{ entry?: WorkspaceEntry; kind: EntryKind } | null>(null),
    [error, setError] = useState(''),
    [loadState, setLoadState] = useState<'error' | 'loading' | 'ready'>('loading'),
    [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
      enabled: false,
      intervalMinutes: 30,
      language: 'cs'
    }),
    [dark, setDark] = useState(localStorage.getItem('mowl-theme') === 'dark')
  async function reload(): Promise<void> {
    try {
      setSnapshot(await window.mowl.workspace.get())
      setError('')
      setLoadState('ready')
    } catch (caught) {
      setError(localizedError(caught, t))
      setLoadState('error')
    }
  }
  useEffect(() => {
    void window.mowl.workspace
      .get()
      .then((value) => {
        setSnapshot(value)
        setLoadState('ready')
      })
      .catch((caught) => {
        setError(localizedError(caught, t))
        setLoadState('error')
      })
    void window.mowl.settings
      .get()
      .then(setReminderSettings)
      .catch((caught) => setError(localizedError(caught, t)))
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('mowl-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => {
    activateLanguage(reminderSettings.language)
  }, [reminderSettings.language])
  const day = snapshot.days.find((item) => item.date === date),
    dayEntries = snapshot.entries.filter((entry) => entry.date === date)
  const shownEntries = filterWorkEntries(snapshot, filters)
  const dashboard = calculateDashboard(snapshot, today())
  const filteredAccounts = snapshot.accounts.filter(
    (account) => !filters.customerId || account.customerId === filters.customerId
  )
  function updateFilter<Key extends keyof WorkEntryFilters>(
    key: Key,
    value: WorkEntryFilters[Key]
  ): void {
    setFilters((current) => ({ ...current, [key]: value || undefined }))
  }
  async function status(value: 'confirmed' | 'draft'): Promise<void> {
    try {
      await window.mowl.workspace.setDayStatus({ date, status: value })
      await reload()
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  async function switchDatabase(): Promise<void> {
    await window.mowl.database.close()
    close()
  }
  async function updateReminderSettings(settings: Partial<ReminderSettings>): Promise<void> {
    try {
      setReminderSettings(await window.mowl.settings.update(settings))
      setError('')
    } catch (caught) {
      setError(localizedError(caught, t))
    }
  }
  const nav: Array<[View, string, ReactNode]> = [
    ['dashboard', t('nav.dashboard'), <LayoutDashboard key="dashboard" size={17} />],
    ['entries', t('nav.entries'), <ListFilter key="entries" size={17} />],
    ['customers', t('nav.customers'), <Building2 key="customers" size={17} />],
    ['accounts', t('nav.accounts'), <BriefcaseBusiness key="accounts" size={17} />],
    ['activities', t('nav.activities'), <Activity key="activities" size={17} />],
    ['checklists', t('nav.checklists'), <CheckSquare2 key="checklists" size={17} />]
  ]
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand compact />
        <div className="database-name">{metadata.displayName}</div>
        <nav>
          {nav.map(([target, label, icon]) => (
            <button
              className={view === target ? 'active' : ''}
              key={target}
              onClick={() => setView(target)}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={view === 'settings' ? 'active' : ''}
            onClick={() => setView('settings')}
          >
            <Settings size={17} />
            <span>{t('nav.settings')}</span>
          </button>
          <button onClick={() => void switchDatabase()}>
            <Database size={17} />
            <span>{t('nav.switchDatabase')}</span>
          </button>
        </div>
      </aside>
      <main className="workspace-main">
        <header className="toolbar">
          <div className="day-control">
            <Input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            <Status status={day?.status ?? 'draft'} />
          </div>
          <div className="toolbar-actions">
            <label className="toolbar-reminder">
              <Clock3 size={17} />
              <span>{t('toolbar.reminders')}</span>
              <Switch
                checked={reminderSettings.enabled}
                onCheckedChange={(enabled) => void updateReminderSettings({ enabled })}
              />
            </label>
            {day?.status === 'confirmed' ? (
              <Button onClick={() => void status('draft')} variant="outline">
                <RotateCcw size={15} />
                {t('day.returnToDraft')}
              </Button>
            ) : (
              <Button
                disabled={dayEntries.length === 0}
                onClick={() => void status('confirmed')}
                variant="outline"
              >
                <CalendarCheck size={15} />
                {t('day.confirm')}
              </Button>
            )}
            <Button
              disabled={day?.status === 'confirmed'}
              onClick={() => setEditor({ kind: 'filler' })}
              variant="outline"
            >
              <Clock3 size={15} />
              {t('common.filler')}
            </Button>
            <Button
              disabled={day?.status === 'confirmed'}
              onClick={() => setEditor({ kind: 'work' })}
            >
              <Plus size={15} />
              {t('entry.newWork')}
            </Button>
          </div>
        </header>
        {error && loadState !== 'error' && (
          <div className="notice error workspace-notice">{error}</div>
        )}
        <div className="workspace-scroll">
          {loadState === 'loading' && (
            <StatePanel icon={<Clock3 size={24} />} title={t('state.loading')}>
              {t('state.loadingDetail')}
            </StatePanel>
          )}
          {loadState === 'error' && (
            <StatePanel
              icon={<Database size={24} />}
              title={
                error.includes('database-not-open')
                  ? t('state.databaseUnavailable')
                  : t('state.loadError')
              }
            >
              <p>{error}</p>
              <div className="state-actions">
                <Button onClick={() => void reload()} variant="outline">
                  {t('state.tryAgain')}
                </Button>
                <Button onClick={() => void switchDatabase()}>{t('state.chooseDatabase')}</Button>
              </div>
            </StatePanel>
          )}
          {loadState === 'ready' && view === 'dashboard' && (
            <section className="content-view">
              <PageHeading eyebrow={t('common.date')} title={t('dashboard.title')}>
                {t('dashboard.dayDetail')}
              </PageHeading>
              <div className="stats-grid">
                <Stat
                  icon={<Clock3 size={19} />}
                  label={t('dashboard.todayTotal')}
                  value={formatDuration(dashboard.today.totalMinutes)}
                  detail={`${formatDuration(dashboard.today.workMinutes)} ${t('work.work')} · ${formatDuration(dashboard.today.fillerMinutes)} ${t('work.filler')}`}
                />
                <Stat
                  icon={<BriefcaseBusiness size={19} />}
                  label={t('dashboard.weekTotal')}
                  value={formatDuration(dashboard.week.totalMinutes)}
                  detail={`${formatDuration(dashboard.week.workMinutes)} ${t('work.work')} · ${formatDuration(dashboard.week.fillerMinutes)} ${t('work.filler')}`}
                />
                <Stat
                  icon={<Building2 size={19} />}
                  label={t('dashboard.activeCustomers')}
                  value={String(snapshot.customers.filter((item) => item.isActive).length)}
                />
                <Stat
                  icon={<CalendarCheck size={19} />}
                  label={t('common.dayStatus')}
                  value={day?.status === 'confirmed' ? t('common.confirmed') : t('day.draft')}
                />
              </div>
              {snapshot.entries.length === 0 ? (
                <StatePanel icon={<Clock3 size={24} />} title={t('dashboard.empty')}>
                  {t('dashboard.emptyDetail')}
                </StatePanel>
              ) : (
                <>
                  <section className="customer-summary">
                    <div className="section-heading">
                      <div>
                        <h2>{t('dashboard.byCustomer')}</h2>
                        <p>
                          {dashboard.weekFrom} {t('common.to')} {dashboard.weekTo}
                        </p>
                      </div>
                    </div>
                    {dashboard.byCustomer.length === 0 ? (
                      <p className="compact-empty">{t('dashboard.noCustomerWork')}</p>
                    ) : (
                      dashboard.byCustomer.map((item) => (
                        <div className="summary-row" key={item.customerId}>
                          <span className="color-label">
                            <i style={{ background: item.color ?? '#8a8a8a' }} />
                            {item.customerName ?? t('common.unknown')}
                          </span>
                          <strong>{formatDuration(item.minutes)}</strong>
                        </div>
                      ))
                    )}
                    <div className="summary-row filler-summary">
                      <span>{t('dashboard.fillerTime')}</span>
                      <strong>{formatDuration(dashboard.week.fillerMinutes)}</strong>
                    </div>
                  </section>
                  <div className="section-heading">
                    <div>
                      <h2>{t('dashboard.recent')}</h2>
                      <p>{t('dashboard.recentDetail')}</p>
                    </div>
                    <Button onClick={() => setView('entries')} variant="ghost">
                      {t('view.all')}
                      <ChevronRight size={15} />
                    </Button>
                  </div>
                  <EntryTable
                    entries={dashboard.recentEntries}
                    onEdit={(entry) =>
                      setEditor({ entry, kind: entry.accountId === null ? 'filler' : 'work' })
                    }
                    snapshot={snapshot}
                  />
                </>
              )}
            </section>
          )}
          {loadState === 'ready' && view === 'entries' && (
            <section className="content-view">
              <div className="entries-heading">
                <PageHeading eyebrow={t('entry.title')} title={t('entry.listTitle')}>
                  {t('entry.listDetail')}
                </PageHeading>
              </div>
              <div className="filter-panel">
                <Field label={t('common.from')}>
                  <Input
                    onChange={(event) => updateFilter('dateFrom', event.target.value)}
                    type="date"
                    value={filters.dateFrom ?? ''}
                  />
                </Field>
                <Field label={t('common.to')}>
                  <Input
                    onChange={(event) => updateFilter('dateTo', event.target.value)}
                    type="date"
                    value={filters.dateTo ?? ''}
                  />
                </Field>
                <Field label={t('common.customer')}>
                  <Select
                    onChange={(event) => {
                      updateFilter('customerId', Number(event.target.value) || undefined)
                      updateFilter('accountId', undefined)
                    }}
                    value={filters.customerId ?? ''}
                  >
                    <option value="">{t('common.allCustomers')}</option>
                    {snapshot.customers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('common.account')}>
                  <Select
                    onChange={(event) =>
                      updateFilter('accountId', Number(event.target.value) || undefined)
                    }
                    value={filters.accountId ?? ''}
                  >
                    <option value="">{t('common.allAccounts')}</option>
                    {filteredAccounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('common.activity')}>
                  <Select
                    onChange={(event) =>
                      updateFilter('activityTypeId', Number(event.target.value) || undefined)
                    }
                    value={filters.activityTypeId ?? ''}
                  >
                    <option value="">{t('activity.all')}</option>
                    {snapshot.activityTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('common.description')}>
                  <Input
                    onChange={(event) => updateFilter('description', event.target.value)}
                    placeholder={t('filter.containsText')}
                    value={filters.description ?? ''}
                  />
                </Field>
                <Field label={t('common.ticket')}>
                  <Input
                    onChange={(event) => updateFilter('ticketNumber', event.target.value)}
                    placeholder={t('filter.containsNumber')}
                    value={filters.ticketNumber ?? ''}
                  />
                </Field>
                <Button
                  disabled={Object.keys(filters).length === 0}
                  onClick={() => setFilters({})}
                  variant="ghost"
                >
                  <ListFilter size={15} />
                  {t('filter.clear')}
                </Button>
              </div>
              <p className="result-count">
                {t(shownEntries.length === 1 ? 'entry.count.one' : 'entry.count.other', {
                  count: shownEntries.length
                })}
              </p>
              <EntryTable
                entries={[...shownEntries].reverse()}
                onEdit={(entry) =>
                  setEditor({ entry, kind: entry.accountId === null ? 'filler' : 'work' })
                }
                snapshot={snapshot}
              />
            </section>
          )}
          {loadState === 'ready' &&
            (['customers', 'accounts', 'activities', 'checklists'] as View[]).includes(view) && (
              <Management
                reload={reload}
                snapshot={snapshot}
                type={view as 'accounts' | 'activities' | 'checklists' | 'customers'}
              />
            )}
          {loadState === 'ready' && view === 'settings' && (
            <SettingsView
              dark={dark}
              reminderSettings={reminderSettings}
              setDark={setDark}
              updateReminderSettings={updateReminderSettings}
            />
          )}
        </div>
      </main>
      {editor && (
        <EntryEditor
          entry={editor.entry}
          kind={editor.kind}
          onClose={() => setEditor(null)}
          reload={reload}
          snapshot={snapshot}
        />
      )}
    </div>
  )
}

function App(): React.JSX.Element {
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null)
  useEffect(() => {
    void window.mowl.database.list().then(async (registry) => {
      const selected = registry.databases.find(
        (item) => item.filePath === registry.selectedFilePath && item.status === 'available'
      )
      if (selected)
        try {
          await window.mowl.workspace.get()
          setMetadata(selected)
        } catch {
          /* Show startup. */
        }
    })
  }, [])
  return metadata ? (
    <Workspace close={() => setMetadata(null)} metadata={metadata} />
  ) : (
    <Startup onOpen={setMetadata} />
  )
}

export default App

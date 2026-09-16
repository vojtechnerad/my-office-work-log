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
  SaveEntryRequest,
  WorkspaceAccount,
  WorkspaceActivityType,
  WorkspaceChecklistDefinition,
  WorkspaceCustomer,
  WorkspaceEntry,
  WorkspaceSnapshot
} from '../../shared/ipc'
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
const entryMinutes = (entry: WorkspaceEntry): number => {
  const [sh, sm] = entry.startTime.split(':').map(Number)
  const [eh, em] = entry.endTime.split(':').map(Number)
  return eh * 60 + em - sh * 60 - sm
}
const formatDuration = (minutes: number): string =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

function Startup({ onOpen }: { onOpen: (metadata: DatabaseMetadata) => void }): React.JSX.Element {
  const [databases, setDatabases] = useState<DatabaseFile[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    void window.mowl.database.list().then((registry) => setDatabases(registry.databases))
  }, [])
  async function open(database: DatabaseFile): Promise<void> {
    try {
      onOpen(await window.mowl.database.open({ filePath: database.filePath }))
    } catch (caught) {
      setError(String(caught))
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
      setError(String(caught))
    }
  }
  return (
    <main className="startup-shell">
      <section className="startup-panel">
        <Brand />
        <div className="startup-heading">
          <p className="eyebrow">LOCAL WORKSPACE</p>
          <h1>Choose your work log</h1>
          <p>Open a local database or create a fresh workspace.</p>
        </div>
        {error && <div className="notice error">{error}</div>}
        <div className="database-list">
          {databases.length === 0 && (
            <p className="empty-state">No databases yet. Create your first work log.</p>
          )}
          {databases.map((item) => (
            <button
              className="database-row"
              disabled={item.status === 'unavailable'}
              key={item.filePath}
              onClick={() => void open(item)}
            >
              <span className="database-icon">
                <Database size={19} />
              </span>
              <span>
                <strong>{item.displayName}</strong>
                <small>{item.description || item.filePath}</small>
              </span>
              <Badge tone={item.status === 'available' ? 'green' : 'red'}>{item.status}</Badge>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <FilePlus2 size={16} />
          New database
        </Button>
      </section>
      <Dialog
        onOpenChange={setCreateOpen}
        open={createOpen}
        title="Create database"
        description="Create a portable local .mowldb file."
      >
        <form className="form-stack" onSubmit={(event) => void create(event)}>
          <Field label="Name">
            <Input autoFocus name="name" required />
          </Field>
          <Field label="Description">
            <Textarea name="description" />
          </Field>
          <Field label="File name">
            <Input name="fileName" placeholder="work-log.mowldb" />
          </Field>
          <div className="dialog-actions">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Dialog>
    </main>
  )
}

function Brand({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <span className="brand-mark">M</span>
      <div>
        <strong>MOWL</strong>
        <small>My Office Work Log</small>
      </div>
    </div>
  )
}
function Status({ status }: { status: 'confirmed' | 'draft' }): React.JSX.Element {
  return (
    <Badge tone={status === 'confirmed' ? 'green' : 'neutral'}>
      {status === 'confirmed' ? 'Confirmed' : 'Draft'}
    </Badge>
  )
}
function Stat({
  icon,
  label,
  value
}: {
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
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Customer / account</th>
            <th>Activity</th>
            <th>Ticket</th>
            <th>Description</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={7}>
                No entries to show.
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
                    {account ? `${customer?.name} / ${account.code}` : 'Filler'}
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
                    aria-label="Edit"
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
      setError(String(caught))
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
    if (!entry || !window.confirm('Permanently delete this entry?')) return
    await window.mowl.workspace.deleteEntry({ id: entry.id })
    await reload()
    onClose()
  }
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open
      title={entry ? 'Edit entry' : kind === 'work' ? 'New work entry' : 'New filler entry'}
      description={locked ? 'Date and time are locked for this confirmed day.' : undefined}
    >
      <form className="editor-form" onSubmit={(event) => void save(event)}>
        {error && <div className="notice error">{error}</div>}
        <div className="form-grid three">
          <Field label="Date">
            <Input
              disabled={locked}
              onChange={(event) => update('date', event.target.value)}
              required
              type="date"
              value={form.date}
            />
          </Field>
          <Field label="Start">
            <Input
              disabled={locked}
              onChange={(event) => update('startTime', event.target.value)}
              required
              type="time"
              value={form.startTime}
            />
          </Field>
          <Field label="End">
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
            <Field label="Account">
              <Select
                onChange={(event) => update('accountId', Number(event.target.value) || null)}
                required
                value={form.accountId ?? ''}
              >
                <option value="">Select</option>
                {snapshot.accounts
                  .filter((item) => item.isActive || item.id === entry?.accountId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Activity">
              <Select
                onChange={(event) => update('activityTypeId', Number(event.target.value) || null)}
                value={form.activityTypeId ?? ''}
              >
                <option value="">None</option>
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
          <Field label="Filler activity">
            <Select
              onChange={(event) => update('activityTypeId', Number(event.target.value) || null)}
              required
              value={form.activityTypeId ?? ''}
            >
              <option value="">Select</option>
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
          <Field label="Ticket">
            <Input
              onChange={(event) => update('ticketNumber', event.target.value)}
              value={form.ticketNumber ?? ''}
            />
          </Field>
        )}
        <Field label="Description">
          <Textarea
            onChange={(event) => update('description', event.target.value)}
            value={form.description ?? ''}
          />
        </Field>
        {entry && kind === 'work' && definitions.length > 0 && (
          <section className="checklist-editor">
            <h3>Customer checklist</h3>
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
                  {!definition.isActive && <Badge>Archived</Badge>}
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
              Delete
            </Button>
          )}
          <Button type="submit">Save entry</Button>
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
  async function run(action: 'deactivate' | 'delete'): Promise<void> {
    try {
      await window.mowl.workspace.mutateReference({ action, entity, id })
      await reload()
    } catch (caught) {
      window.alert(String(caught))
    }
  }
  return (
    <span className="row-actions">
      <Button
        aria-label="Deactivate"
        onClick={() => void run('deactivate')}
        size="icon"
        title="Deactivate"
        variant="ghost"
      >
        <RotateCcw size={15} />
      </Button>
      <Button
        aria-label="Delete"
        onClick={() => void run('delete')}
        size="icon"
        title="Delete"
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
  return (
    <div className="management-row">
      <span className="management-symbol" style={{ background: color ?? undefined }}>
        {color ? '' : <CheckSquare2 size={15} />}
      </span>
      <div className="management-copy">
        <strong>{name}</strong>
        <small>{meta}</small>
      </div>
      {!active && <Badge>Inactive</Badge>}
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
        Add
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
  const [editing, setEditing] = useState<
    WorkspaceAccount | WorkspaceActivityType | WorkspaceCustomer | null
  >(null)
  const info = {
    customers: ['Customers', 'Clients and their colors across MOWL.'],
    accounts: ['Accounts', 'Project accounts and active date ranges.'],
    activities: ['Activity types', 'Separate color-coded work and filler activities.'],
    checklists: ['Customer checklists', 'Items inherited by work entries for each customer.']
  }[type]
  async function create(request: ReferenceMutation): Promise<void> {
    await window.mowl.workspace.mutateReference(request)
    await reload()
  }
  return (
    <section className="content-view">
      <PageHeading eyebrow="REFERENCE DATA" title={info[0]}>
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
            <Input name="name" placeholder="Customer name" required />
            <Input className="color-input" defaultValue="#111111" name="color" type="color" />
          </AddForm>
          <div className="management-list">
            {snapshot.customers.map((item) => (
              <ManagementRow
                active={item.isActive}
                color={item.color}
                key={item.id}
                meta="Customer"
                name={item.name}
              >
                <Button
                  aria-label="Edit"
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
              <option value="">Customer</option>
              {snapshot.customers
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <Input name="code" placeholder="Code" required />
            <Input name="name" placeholder="Account name" required />
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
                  aria-label="Edit"
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
              <option value="work">Work</option>
              <option value="filler">Filler</option>
            </Select>
            <Input name="name" placeholder="Activity name" required />
            <Input className="color-input" defaultValue="#333333" name="color" type="color" />
            <Input defaultValue="0" min="0" name="order" type="number" />
          </AddForm>
          <div className="management-list">
            {snapshot.activityTypes.map((item) => (
              <ManagementRow
                active={item.isActive}
                color={item.color}
                key={item.id}
                meta={`${item.category} · order ${item.sortOrder}`}
                name={item.name}
              >
                <Button
                  aria-label="Edit"
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
              <option value="">Customer</option>
              {snapshot.customers
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <Input name="name" placeholder="Checklist item" required />
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
    <Dialog onOpenChange={(open) => !open && onClose()} open title="Edit reference item">
      <form className="form-stack" onSubmit={(event) => void save(event)}>
        {isAccount && (
          <Field label="Customer">
            <Select defaultValue={item.customerId} name="customer">
              {snapshot.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Name">
          <Input defaultValue={item.name} name="name" required />
        </Field>
        {isAccount && (
          <>
            <Field label="Code">
              <Input defaultValue={item.code} name="code" required />
            </Field>
            <div className="form-grid two">
              <Field label="Active from">
                <Input defaultValue={item.activeFrom} name="from" type="date" />
              </Field>
              <Field label="Active until">
                <Input defaultValue={item.activeUntil ?? ''} name="until" type="date" />
              </Field>
            </div>
          </>
        )}
        {isActivity && (
          <>
            <Field label="Color">
              <Input defaultValue={item.color} name="color" type="color" />
            </Field>
            <Field label="Sort order">
              <Input defaultValue={item.sortOrder} name="order" type="number" />
            </Field>
          </>
        )}
        {!isAccount && !isActivity && (
          <Field label="Color">
            <Input defaultValue={item.color ?? '#111111'} name="color" type="color" />
          </Field>
        )}
        <div className="dialog-actions">
          <Button type="submit">Save changes</Button>
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
      meta={snapshot.customers.find((item) => item.id === definition.customerId)?.name ?? 'Unknown'}
      name={
        <Input
          aria-label="Checklist name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      }
    >
      <Button
        aria-label="Save"
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
function SettingsView({
  dark,
  setDark
}: {
  dark: boolean
  setDark: (value: boolean) => void
}): React.JSX.Element {
  const [reminders, setReminders] = useState(localStorage.getItem('mowl-reminders') === 'true')
  return (
    <section className="content-view">
      <PageHeading eyebrow="PREFERENCES" title="Settings">
        Appearance, language, and work-hour reminders.
      </PageHeading>
      <div className="settings-group">
        <h2>Appearance</h2>
        <div className="setting-row">
          <span>{dark ? <Moon size={18} /> : <Sun size={18} />}</span>
          <div>
            <strong>Dark theme</strong>
            <small>Use the dark neutral palette.</small>
          </div>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>
        <div className="setting-row">
          <span />
          <div>
            <strong>Language</strong>
            <small>Interface language</small>
          </div>
          <Select defaultValue="en">
            <option value="en">English</option>
            <option value="cs">Čeština</option>
          </Select>
        </div>
      </div>
      <div className="settings-group">
        <h2>Reminders</h2>
        <div className="setting-row">
          <span>
            <Clock3 size={18} />
          </span>
          <div>
            <strong>Work-hour reminders</strong>
            <small>Notify while MOWL is running.</small>
          </div>
          <Switch
            checked={reminders}
            onCheckedChange={(value) => {
              setReminders(value)
              localStorage.setItem('mowl-reminders', String(value))
            }}
          />
        </div>
        <div className="setting-row">
          <span />
          <div>
            <strong>Interval</strong>
            <small>Reminder frequency</small>
          </div>
          <Select disabled={!reminders} defaultValue="30">
            <option>15</option>
            <option>30</option>
            <option>60</option>
            <option>120</option>
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
  const [snapshot, setSnapshot] = useState(emptyWorkspace),
    [view, setView] = useState<View>('dashboard'),
    [date, setDate] = useState(today()),
    [filter, setFilter] = useState(''),
    [editor, setEditor] = useState<{ entry?: WorkspaceEntry; kind: EntryKind } | null>(null),
    [error, setError] = useState(''),
    [dark, setDark] = useState(localStorage.getItem('mowl-theme') === 'dark')
  async function reload(): Promise<void> {
    try {
      setSnapshot(await window.mowl.workspace.get())
      setError('')
    } catch (caught) {
      setError(String(caught))
    }
  }
  useEffect(() => {
    void window.mowl.workspace
      .get()
      .then(setSnapshot)
      .catch((caught) => setError(String(caught)))
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('mowl-theme', dark ? 'dark' : 'light')
  }, [dark])
  const day = snapshot.days.find((item) => item.date === date),
    dayEntries = snapshot.entries.filter((entry) => entry.date === date)
  const shownEntries = snapshot.entries.filter((entry) =>
    [
      entry.description,
      entry.ticketNumber,
      snapshot.accounts.find((item) => item.id === entry.accountId)?.code
    ].some((value) => value?.toLowerCase().includes(filter.toLowerCase()))
  )
  async function status(value: 'confirmed' | 'draft'): Promise<void> {
    try {
      await window.mowl.workspace.setDayStatus({ date, status: value })
      await reload()
    } catch (caught) {
      setError(String(caught))
    }
  }
  async function switchDatabase(): Promise<void> {
    await window.mowl.database.close()
    close()
  }
  const nav: Array<[View, string, ReactNode]> = [
    ['dashboard', 'Dashboard', <LayoutDashboard key="dashboard" size={17} />],
    ['entries', 'Work entries', <ListFilter key="entries" size={17} />],
    ['customers', 'Customers', <Building2 key="customers" size={17} />],
    ['accounts', 'Accounts', <BriefcaseBusiness key="accounts" size={17} />],
    ['activities', 'Activity types', <Activity key="activities" size={17} />],
    ['checklists', 'Checklists', <CheckSquare2 key="checklists" size={17} />]
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
            <span>Settings</span>
          </button>
          <button onClick={() => void switchDatabase()}>
            <Database size={17} />
            <span>Switch database</span>
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
            {day?.status === 'confirmed' ? (
              <Button onClick={() => void status('draft')} variant="outline">
                <RotateCcw size={15} />
                Return to draft
              </Button>
            ) : (
              <Button
                disabled={dayEntries.length === 0}
                onClick={() => void status('confirmed')}
                variant="outline"
              >
                <CalendarCheck size={15} />
                Confirm day
              </Button>
            )}
            <Button
              disabled={day?.status === 'confirmed'}
              onClick={() => setEditor({ kind: 'filler' })}
              variant="outline"
            >
              <Clock3 size={15} />
              Filler
            </Button>
            <Button
              disabled={day?.status === 'confirmed'}
              onClick={() => setEditor({ kind: 'work' })}
            >
              <Plus size={15} />
              Work entry
            </Button>
          </div>
        </header>
        {error && <div className="notice error workspace-notice">{error}</div>}
        <div className="workspace-scroll">
          {view === 'dashboard' && (
            <section className="content-view">
              <PageHeading eyebrow={date === today() ? 'TODAY' : date} title="Work overview">
                Recorded time and current day status.
              </PageHeading>
              <div className="stats-grid">
                <Stat
                  icon={<Clock3 size={19} />}
                  label="Recorded"
                  value={formatDuration(
                    dayEntries.reduce((sum, entry) => sum + entryMinutes(entry), 0)
                  )}
                />
                <Stat
                  icon={<BriefcaseBusiness size={19} />}
                  label="Work entries"
                  value={String(dayEntries.filter((entry) => entry.accountId !== null).length)}
                />
                <Stat
                  icon={<Building2 size={19} />}
                  label="Active customers"
                  value={String(snapshot.customers.filter((item) => item.isActive).length)}
                />
                <Stat
                  icon={<CalendarCheck size={19} />}
                  label="Day status"
                  value={day?.status ?? 'Draft'}
                />
              </div>
              <div className="section-heading">
                <div>
                  <h2>Recent entries</h2>
                  <p>Latest recorded work and filler time.</p>
                </div>
                <Button onClick={() => setView('entries')} variant="ghost">
                  View all
                  <ChevronRight size={15} />
                </Button>
              </div>
              <EntryTable
                entries={[...snapshot.entries].reverse().slice(0, 6)}
                onEdit={(entry) =>
                  setEditor({ entry, kind: entry.accountId === null ? 'filler' : 'work' })
                }
                snapshot={snapshot}
              />
            </section>
          )}
          {view === 'entries' && (
            <section className="content-view">
              <div className="entries-heading">
                <PageHeading eyebrow="TIME LOG" title="Work entries">
                  Checklists are available only inside entry details.
                </PageHeading>
                <div className="search">
                  <ListFilter size={16} />
                  <Input
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Search entries"
                    value={filter}
                  />
                </div>
              </div>
              <EntryTable
                entries={[...shownEntries].reverse()}
                onEdit={(entry) =>
                  setEditor({ entry, kind: entry.accountId === null ? 'filler' : 'work' })
                }
                snapshot={snapshot}
              />
            </section>
          )}
          {(['customers', 'accounts', 'activities', 'checklists'] as View[]).includes(view) && (
            <Management
              reload={reload}
              snapshot={snapshot}
              type={view as 'accounts' | 'activities' | 'checklists' | 'customers'}
            />
          )}
          {view === 'settings' && <SettingsView dark={dark} setDark={setDark} />}
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

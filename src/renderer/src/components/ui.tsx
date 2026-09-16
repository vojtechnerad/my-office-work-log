import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'
import { useT } from '../i18n'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva('button', {
  variants: {
    size: { default: 'button-default', icon: 'button-icon', sm: 'button-sm' },
    variant: {
      default: 'button-primary',
      destructive: 'button-destructive',
      ghost: 'button-ghost',
      outline: 'button-outline'
    }
  },
  defaultVariants: { size: 'default', variant: 'default' }
})

export function Button({
  asChild,
  className,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }): React.JSX.Element {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ size, variant }), className)} {...props} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <input {...props} className={cn('input', props.className)} />
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
): React.JSX.Element {
  return <textarea {...props} className={cn('input textarea', props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return <select {...props} className={cn('input select', props.className)} />
}

export function Label({
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return (
    <label {...props} className={cn('label', props.className)}>
      {children}
    </label>
  )
}

export function Badge({
  children,
  tone = 'neutral'
}: {
  children: ReactNode
  tone?: 'green' | 'neutral' | 'red'
}): React.JSX.Element {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Switch({
  checked,
  onCheckedChange
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <SwitchPrimitive.Root checked={checked} className="switch" onCheckedChange={onCheckedChange}>
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  )
}

export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title
}: {
  children: ReactNode
  description?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}): React.JSX.Element {
  const t = useT()
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <header className="dialog-header">
            <div>
              <DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="dialog-description">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button aria-label={t('common.close')} size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Field({
  children,
  label
}: {
  children: ReactNode
  label: string
}): React.JSX.Element {
  return (
    <Label>
      <span>{label}</span>
      {children}
    </Label>
  )
}

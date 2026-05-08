"use client"

import type { StaffCreatorPayoutRunRecord } from "@workspace/backend/lib/staffTypes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

export type CreatorPayoutExecuteConfirmationState = {
  confirmation: string
  payoutRun: StaffCreatorPayoutRunRecord
}

export function CreatorPayoutExecuteDialog(args: {
  actionPending: boolean
  formatCurrencyTotals: (
    totals: Array<{ amount: number; currency: string }>
  ) => string
  onClose: () => void
  onConfirm: (payoutRunId: string) => void
  onConfirmationChange: (confirmation: string) => void
  state: CreatorPayoutExecuteConfirmationState | null
}) {
  return (
    <AlertDialog
      open={Boolean(args.state)}
      onOpenChange={(open) => !open && args.onClose()}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader className="items-start text-left">
          <AlertDialogTitle>Execute manual transfer run</AlertDialogTitle>
          <AlertDialogDescription>
            This can create Stripe Connect transfers for the selected manual
            review run. Clean monthly runs are handled by the schedule.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {args.state ? (
          <FieldGroup>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4 text-sm">
              <div className="font-medium">
                {args.formatCurrencyTotals(args.state.payoutRun.currencyTotals)}
              </div>
              <div className="mt-1 text-muted-foreground">
                {args.state.payoutRun.creatorCount} creator(s),{" "}
                {args.state.payoutRun.transferCount} transfer(s)
              </div>
            </div>
            <Field>
              <FieldLabel>Type EXECUTE</FieldLabel>
              <Input
                autoComplete="off"
                onChange={(event) =>
                  args.onConfirmationChange(event.target.value)
                }
                value={args.state.confirmation}
              />
              <FieldDescription>
                Manual execution is for reviewed runs and exceptions only.
              </FieldDescription>
            </Field>
          </FieldGroup>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={
              args.actionPending || args.state?.confirmation !== "EXECUTE"
            }
            onClick={(event) => {
              event.preventDefault()

              if (!args.state) {
                return
              }

              args.onConfirm(args.state.payoutRun.id)
            }}
          >
            Execute
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

"use client"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { InvoiceHistoryEntry } from "@/features/billing/lib/billing-types"
import { formatCurrencyAmount, formatDateLabel } from "@/features/billing/lib/format"

export function InvoiceHistoryTable(args: {
  invoices: InvoiceHistoryEntry[]
}) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>Invoice history</CardTitle>
        <CardDescription>
          Recent Stripe invoices for the authenticated billing customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="rounded-lg border border-border/70 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {args.invoices.length > 0 ? (
              args.invoices.map((invoice) => (
                <TableRow key={`${invoice.invoiceNumber ?? invoice.createdAt}`}>
                  <TableCell>{formatDateLabel(invoice.createdAt)}</TableCell>
                  <TableCell className="max-w-[24rem] whitespace-normal">
                    {invoice.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "paid" ? "secondary" : "outline"}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrencyAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3 text-sm">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          className="text-primary hover:underline"
                          href={invoice.hostedInvoiceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View
                        </a>
                      ) : null}
                      {invoice.invoicePdfUrl ? (
                        <a
                          className="text-primary hover:underline"
                          href={invoice.invoicePdfUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          PDF
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-sm text-muted-foreground"
                  colSpan={5}
                >
                  No invoices have been issued yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

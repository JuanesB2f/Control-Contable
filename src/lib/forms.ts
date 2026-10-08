import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import type { ActionError } from "@/lib/action-result"

/** Shows a Server Action error on the form: field errors inline, everything else as a toast. */
export function applyActionError<T extends FieldValues>(form: UseFormReturn<T>, error: ActionError) {
  const fieldErrors = Object.entries(error.fieldErrors ?? {}).filter(([field]) => field in form.getValues())

  if (fieldErrors.length === 0) {
    toast.error(error.message)
    return
  }
  fieldErrors.forEach(([field, message], index) => {
    form.setError(field as FieldPath<T>, { type: "server", message }, { shouldFocus: index === 0 })
  })
}

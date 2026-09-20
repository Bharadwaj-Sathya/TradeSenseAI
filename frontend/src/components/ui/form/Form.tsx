import {
  FormProvider,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void | Promise<void>;
  children: React.ReactNode;
};

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
}: Props<T>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}

import { useFormContext } from "react-hook-form";

type Props = {
  name: string;
  label?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function FormInput({ name, label, ...props }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="space-y-1">
      {label && <label className="text-sm">{label}</label>}

      <input
        {...register(name)}
        {...props}
        className={`w-full rounded border px-3 py-2
          ${error ? "border-red-500" : "border-gray-300"}`}
      />

      {error && (
        <p className="text-sm text-red-500">{error.message as string}</p>
      )}
    </div>
  );
}

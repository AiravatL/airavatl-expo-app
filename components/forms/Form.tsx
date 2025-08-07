import React from 'react';
import { useForm, Controller, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View, Text, StyleSheet } from 'react-native';
import { z } from 'zod';
import { Input, Button } from '../ui';

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  required?: boolean;
  control: any;
  errors: any;
}

function FormField<T extends FieldValues>({
  name,
  label,
  placeholder,
  secureTextEntry,
  multiline,
  required,
  control,
  errors,
}: FormFieldProps<T>) {
  const error = errors[name];

  return (
    <View style={styles.fieldContainer}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            placeholder={placeholder || label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            error={error?.message}
          />
        )}
      />
    </View>
  );
}

interface FormProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => void | Promise<void>;
  children: (props: {
    control: any;
    errors: any;
    isValid: boolean;
    isSubmitting: boolean;
    handleSubmit: () => void;
    reset: () => void;
    watch: any;
    FormField: React.ComponentType<FormFieldProps<T>>;
  }) => React.ReactNode;
  defaultValues?: Partial<T>;
}

function Form<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  defaultValues,
}: FormProps<T>) {
  const form = useForm<T>({
    // @ts-ignore - zodResolver type inference issues with generic schemas
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
    watch,
  } = form;

  const onSubmitHandler = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const BoundFormField = (
    props: Omit<FormFieldProps<T>, 'control' | 'errors'>
  ) => <FormField {...props} control={control} errors={errors} />;

  return (
    <>
      {children({
        control,
        errors,
        isValid,
        isSubmitting,
        handleSubmit: handleSubmit(onSubmitHandler as any),
        reset,
        watch,
        FormField: BoundFormField,
      })}
    </>
  );
}

// Utility component for form actions
interface FormActionsProps {
  onSubmit: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  isValid?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({
  onSubmit,
  onCancel,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isSubmitting = false,
  isValid = true,
}) => (
  <View style={styles.actionsContainer}>
    {onCancel && (
      <Button
        title={cancelText}
        variant="outline"
        onPress={onCancel}
        style={styles.cancelButton}
        disabled={isSubmitting}
      />
    )}
    <Button
      title={submitText}
      onPress={onSubmit}
      loading={isSubmitting}
      disabled={!isValid || isSubmitting}
      style={styles.submitButton}
    />
  </View>
);

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#DC3545',
  },
  inputError: {
    borderColor: '#DC3545',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export { Form, FormField, FormActions };
export type { FormProps, FormFieldProps, FormActionsProps };

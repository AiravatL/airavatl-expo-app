import { z } from 'zod';

// Common validation schemas

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// Auth schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  role: z.enum(['consigner', 'driver']).refine((val) => !!val, {
    message: 'Please select a role',
  }),
});

// Auction schemas
export const auctionSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  starting_price: z
    .number()
    .min(1, 'Starting price must be greater than 0')
    .max(1000000, 'Starting price must be less than ₹10,00,000'),
  end_time: z.string().min(1, 'End time is required'),
  vehicle_type: z.enum([
    'three_wheeler',
    'pickup_truck',
    'mini_truck',
    'medium_truck',
    'large_truck',
  ]).refine((val) => !!val, {
    message: 'Please select a vehicle type',
  }),
  route_from: z
    .string()
    .min(1, 'Pick-up location is required')
    .max(100, 'Pick-up location must be less than 100 characters'),
  route_to: z
    .string()
    .min(1, 'Drop-off location is required')
    .max(100, 'Drop-off location must be less than 100 characters'),
  estimated_distance: z
    .number()
    .min(1, 'Distance must be greater than 0')
    .max(5000, 'Distance must be less than 5000 km'),
  load_type: z
    .string()
    .min(1, 'Load type is required')
    .max(50, 'Load type must be less than 50 characters'),
});

export const bidSchema = z.object({
  amount: z
    .number()
    .min(1, 'Bid amount must be greater than 0')
    .max(1000000, 'Bid amount must be less than ₹10,00,000'),
});

// Profile schemas
export const profileSchema = z.object({
  username: usernameSchema,
  bio: z
    .string()
    .max(200, 'Bio must be less than 200 characters')
    .optional(),
  phone: phoneSchema.optional(),
  vehicle_type: z.enum([
    'three_wheeler',
    'pickup_truck',
    'mini_truck',
    'medium_truck',
    'large_truck',
  ]).optional(),
});

// Type exports for use in components
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type AuctionFormData = z.infer<typeof auctionSchema>;
export type BidFormData = z.infer<typeof bidSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;

// Validation helper functions
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

export function validatePassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

export function validatePhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

export function validateUPI(upi: string): boolean {
  // UPI ID format: username@bankname or username@paytm etc.
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(upi) && upi.length >= 5 && upi.length <= 50;
}

export function validateWeight(weight: number): boolean {
  return weight > 0 && weight <= 50000; // Max 50 tons
}

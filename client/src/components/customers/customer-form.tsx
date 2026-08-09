'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-api';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  location: z.string().optional(),
  preferredLanguage: z.string().default('en'),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
}

export function CustomerForm({ open, onOpenChange, customer }: CustomerFormProps) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || '',
      company: customer?.company || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      location: customer?.location || '',
      preferredLanguage: customer?.preferredLanguage || 'en',
      notes: customer?.notes || '',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (customer) {
        await updateMutation.mutateAsync({ id: customer.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update customer information' : 'Add a new customer to the system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" {...register('company')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" placeholder="+923001234567" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Preferred Language</Label>
            <Select
              defaultValue={customer?.preferredLanguage || 'en'}
              onValueChange={(value) => setValue('preferredLanguage', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ur">Urdu</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register('notes')} />
          </div>
          <DialogFooter className="sticky bottom-0 bg-white pt-4 pb-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {customer ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { useCreateElevator, useUpdateElevator } from '@/hooks/use-api';

const elevatorSchema = z.object({
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  type: z.enum(['PASSENGER', 'FREIGHT', 'HOME', 'ESCALATOR']).optional(),
  installationDate: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED']).default('ACTIVE'),
  notes: z.string().optional(),
});

type ElevatorFormData = z.infer<typeof elevatorSchema>;

interface ElevatorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  elevator?: any;
}

export function ElevatorForm({ open, onOpenChange, customerId, elevator }: ElevatorFormProps) {
  const createMutation = useCreateElevator();
  const updateMutation = useUpdateElevator();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ElevatorFormData>({
    resolver: zodResolver(elevatorSchema),
    defaultValues: {
      model: elevator?.model || '',
      serialNumber: elevator?.serialNumber || '',
      type: elevator?.type || 'PASSENGER',
      installationDate: elevator?.installationDate?.split('T')[0] || '',
      lastMaintenanceDate: elevator?.lastMaintenanceDate?.split('T')[0] || '',
      nextMaintenanceDate: elevator?.nextMaintenanceDate?.split('T')[0] || '',
      status: elevator?.status || 'ACTIVE',
      notes: elevator?.notes || '',
    },
  });

  const onSubmit = async (data: ElevatorFormData) => {
    try {
      if (elevator) {
        await updateMutation.mutateAsync({ id: elevator.id, data });
      } else {
        await createMutation.mutateAsync({ customerId, data });
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save elevator:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{elevator ? 'Edit Elevator' : 'Add Elevator'}</DialogTitle>
          <DialogDescription>
            {elevator ? 'Update elevator information' : 'Add a new elevator for this customer'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" {...register('model')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input id="serialNumber" {...register('serialNumber')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              defaultValue={elevator?.type || 'PASSENGER'}
              onValueChange={(value) => setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PASSENGER">Passenger</SelectItem>
                <SelectItem value="FREIGHT">Freight</SelectItem>
                <SelectItem value="HOME">Home</SelectItem>
                <SelectItem value="ESCALATOR">Escalator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={elevator?.status || 'ACTIVE'}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="installationDate">Installation Date</Label>
            <Input id="installationDate" type="date" {...register('installationDate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastMaintenanceDate">Last Maintenance</Label>
            <Input id="lastMaintenanceDate" type="date" {...register('lastMaintenanceDate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextMaintenanceDate">Next Maintenance</Label>
            <Input id="nextMaintenanceDate" type="date" {...register('nextMaintenanceDate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {elevator ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

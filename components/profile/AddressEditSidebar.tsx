"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import LocationSelector from "@/components/ui/location-selector";
import { MapPin, Save, X, Trash2 } from "lucide-react";

interface Address {
  _id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  default: boolean;
  type: "home" | "office" | "other";
  phone?: string;
  subArea?: string;
  countryCode?: string;
  stateCode?: string;
}

interface AddressEditSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address | null;
  userId: string;
  onAddressChange?: () => void;
}

export default function AddressEditSidebar({
  isOpen,
  onClose,
  address,
  userId,
  onAddressChange,
}: AddressEditSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<Address>({
    _id: address?._id || "",
    name: address?.name || "",
    address: address?.address || "",
    city: address?.city || "",
    state: address?.state || "",
    zip: address?.zip || "",
    country: address?.country || "",
    countryCode: address?.countryCode || "",
    stateCode: address?.stateCode || "",
    subArea: address?.subArea || "",
    default: address?.default || false,
    type: address?.type || "home",
    phone: address?.phone || "",
  });

  const isEditing = !!address?._id;

  const handleLocationChange = (location: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    subArea?: string;
    zipCode?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      country: location.country,
      countryCode: location.countryCode,
      state: location.state,
      stateCode: location.stateCode,
      city: location.city,
      subArea: location.subArea || "",
      zip: location.zipCode || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation
    if (
      !formData.name ||
      !formData.address ||
      !formData.city ||
      !formData.state ||
      !formData.zip ||
      !formData.country
    ) {
      showToast.error(
        "Validation Error",
        "Please fill in all required fields including location details."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/user/addresses", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          userId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(
          isEditing ? "Address Updated" : "Address Added",
          `Your address has been successfully ${
            isEditing ? "updated" : "added"
          }.`
        );
        onClose();
        // Call callback to refresh addresses instead of page reload
        if (onAddressChange) {
          onAddressChange();
        }
      } else {
        console.error("API Error:", result);
        throw new Error(
          result.error || `Failed to ${isEditing ? "update" : "add"} address`
        );
      }
    } catch (error) {
      console.error("Error saving address:", error);
      showToast.error(
        "Error",
        error instanceof Error
          ? error.message
          : `Failed to ${
              isEditing ? "update" : "add"
            } address. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !address?._id) return;

    if (!confirm("Are you sure you want to delete this address?")) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/user/addresses`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addressId: address._id }),
      });

      if (response.ok) {
        showToast.success(
          "Address Deleted",
          "Your address has been successfully deleted."
        );
        onClose();
        // Call callback to refresh addresses instead of page reload
        if (onAddressChange) {
          onAddressChange();
        }
      } else {
        throw new Error("Failed to delete address");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      showToast.error("Error", "Failed to delete address. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInputChange = (field: keyof Address, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <SheetTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>{isEditing ? "Edit" : "Add"} Shipping Address</span>
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update your shipping address information."
              : "Add a new shipping address to your account."}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Name */}
            <div>
              <Label htmlFor="name">Address Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Home, Office, Mom's House"
                required
                className="mt-1"
              />
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="e.g., (555) 123-4567"
                className="mt-1"
              />
            </div>

            {/* Address Type */}
            <div>
              <Label htmlFor="type">Address Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  handleInputChange(
                    "type",
                    value as "home" | "office" | "other"
                  )
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select address type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Street Address */}
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter your street address (house number, street name, apartment/unit)"
                required
                className="mt-1"
              />
            </div>

            {/* Location Selector */}
            <div>
              <LocationSelector
                value={{
                  country: formData.country,
                  countryCode: formData.countryCode || "",
                  state: formData.state,
                  stateCode: formData.stateCode || "",
                  city: formData.city,
                  subArea: formData.subArea || "",
                  zipCode: formData.zip,
                }}
                onChange={handleLocationChange}
                className="mt-1"
              />
            </div>

            {/* Default Address Switch */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="default" className="text-sm font-medium">
                  Set as Default Address
                </Label>
                <p className="text-xs text-gray-500">
                  This address will be used as your primary shipping address
                </p>
              </div>
              <Switch
                id="default"
                checked={formData.default}
                onCheckedChange={(checked) =>
                  handleInputChange("default", checked)
                }
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditing ? "Updating..." : "Adding..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? "Update" : "Add"} Address</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading || deleteLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>

            {/* Delete Button for Editing */}
            {isEditing && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteLoading || loading}
                  className="w-full"
                >
                  {deleteLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Address</span>
                    </div>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

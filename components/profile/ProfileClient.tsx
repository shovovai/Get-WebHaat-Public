"use client";
import { formatPrice } from "@/lib/storeConfig";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Plus,
  Home,
  CheckCircle,
} from "lucide-react";
import ProfileEditSidebar from "./ProfileEditSidebar";
import AddressEditSidebar from "./AddressEditSidebar";

interface EmailAddress {
  emailAddress: string;
  id: string;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: EmailAddress[];
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt?: string;
  phone?: string;
}

interface SanityUser {
  _id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  addresses?: Address[];
  preferences?: Record<string, unknown>;
  loyaltyPoints?: number;
  rewardPoints?: number;
  totalSpent?: number;
  lastLogin?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileClientProps {
  userData: {
    clerk: ClerkUser;
    sanity: SanityUser | null;
  };
}

export default function ProfileClient({ userData }: ProfileClientProps) {
  const { clerk, sanity } = userData;
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [addressSidebarOpen, setAddressSidebarOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const displayName =
    clerk.firstName && clerk.lastName
      ? `${clerk.firstName} ${clerk.lastName}`
      : sanity?.firstName && sanity?.lastName
      ? `${sanity.firstName} ${sanity.lastName}`
      : clerk.firstName || sanity?.firstName || "User";

  const displayEmail =
    clerk.emailAddresses?.[0]?.emailAddress || sanity?.email || "";

  const handleEditProfile = () => {
    setProfileSidebarOpen(true);
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressSidebarOpen(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressSidebarOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={clerk.imageUrl || sanity?.profileImage?.asset?.url}
                    alt={displayName}
                  />
                  <AvatarFallback className="bg-gray-100 text-gray-900">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {displayName}
                  </h1>
                  <p className="text-gray-600 flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2" />
                    {displayEmail}
                  </p>
                  {sanity?.phone && (
                    <p className="text-gray-600 flex items-center mt-1">
                      <Phone className="h-4 w-4 mr-2" />
                      {sanity.phone}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleEditProfile}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {new Date(clerk.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {sanity?.rewardPoints !== undefined && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reward Points</p>
                    <p className="font-medium">{sanity.rewardPoints}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-gray-900" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200"
                  >
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Personal Information */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  First Name
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {clerk.firstName || "Not provided"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  From Clerk (Read-only)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Last Name
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {clerk.lastName || "Not provided"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  From Clerk (Read-only)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {displayEmail}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  From Clerk (Read-only)
                </p>
              </div>

              {sanity && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone Number
                    </label>
                    <p className="text-gray-900 bg-white border p-2 rounded-md">
                      {sanity.phone || "Not provided"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Editable in profile
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date of Birth
                    </label>
                    <p className="text-gray-900 bg-white border p-2 rounded-md">
                      {sanity.dateOfBirth
                        ? new Date(sanity.dateOfBirth).toLocaleDateString()
                        : "Not provided"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Editable in profile
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Reward Points</span>
                <span className="font-bold text-gray-900">
                  {sanity?.rewardPoints || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700">Total Spent</span>
                <span className="font-bold text-green-600">
                  {formatPrice(sanity?.totalSpent)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Loyalty Points</span>
                <span className="font-bold text-gray-900">
                  {sanity?.loyaltyPoints || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Last Login</span>
                <span className="font-medium text-gray-600">
                  {sanity?.lastLogin
                    ? new Date(sanity.lastLogin).toLocaleDateString()
                    : "Today"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Addresses */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Shipping Addresses</span>
            </CardTitle>
            <Button
              onClick={handleAddAddress}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Address</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sanity?.addresses && sanity.addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sanity.addresses.map((address) => (
                <div
                  key={address._id}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{address.name}</span>
                    </div>
                    {address.default && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-200"
                      >
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{address.address}</p>
                    <p>
                      {address.city}, {address.state} {address.zip}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAddress(address)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No shipping addresses found</p>
              <Button onClick={handleAddAddress} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Address
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Edit Sidebar */}
      {profileSidebarOpen && (
        <ProfileEditSidebar
          isOpen={profileSidebarOpen}
          onClose={() => setProfileSidebarOpen(false)}
          userData={userData}
        />
      )}

      {/* Address Edit Sidebar */}
      {addressSidebarOpen && (
        <AddressEditSidebar
          isOpen={addressSidebarOpen}
          onClose={() => setAddressSidebarOpen(false)}
          address={editingAddress}
          userId={clerk.id}
        />
      )}
    </div>
  );
}

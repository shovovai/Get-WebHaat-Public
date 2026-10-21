import { FC } from "react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  UserX,
  Database,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    inSanity: boolean;
    notificationCount?: number;
  } | null;
  action: "activate" | "deactivate" | "delete" | null;
  isLoading: boolean;
}

export const UserActionModal: FC<UserActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  action,
  isLoading,
}) => {
  if (!user || !action) return null;

  const getActionConfig = () => {
    switch (action) {
      case "activate":
        return {
          title: user.inSanity
            ? "Activate User in Sanity"
            : "Add User to Sanity",
          icon: <UserCheck className="h-5 w-5 text-green-600" />,
          description: user.inSanity
            ? "This will activate the user in Sanity, allowing them to receive notifications."
            : "This will create a new user record in Sanity and activate them for notifications.",
          confirmText: user.inSanity ? "Activate User" : "Add to Sanity",
          confirmVariant: "default" as const,
          consequences: [
            user.inSanity
              ? "User will be activated in Sanity"
              : "User will be created in Sanity database",
            "User will be able to receive notifications",
            "User data will be synchronized with Clerk",
            "Action will be logged with your admin email",
          ],
        };

      case "deactivate":
        return {
          title: "Deactivate User in Sanity",
          icon: <UserX className="h-5 w-5 text-orange-600" />,
          description:
            "This will deactivate the user in Sanity. They will no longer receive notifications.",
          confirmText: "Deactivate User",
          confirmVariant: "destructive" as const,
          consequences: [
            "User will be deactivated in Sanity",
            "User will NOT receive any notifications",
            "User data will remain in Sanity but marked as inactive",
            "User can be reactivated later if needed",
          ],
        };

      case "delete":
        return {
          title: "Delete User from Sanity",
          icon: <Trash2 className="h-5 w-5 text-red-600" />,
          description:
            "This will permanently delete the user record from Sanity database.",
          confirmText: "Delete from Sanity",
          confirmVariant: "destructive" as const,
          consequences: [
            "User record will be permanently deleted from Sanity",
            "All user data, preferences, and history will be lost",
            "User will no longer receive notifications",
            "This action CANNOT be undone",
            "User will remain in Clerk authentication system",
          ],
        };

      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
          )}
        >
          <VisuallyHidden.Root>
            <DialogTitle>{config.title}</DialogTitle>
          </VisuallyHidden.Root>

          {/* Header */}
          <div className="text-center space-y-3">
            <div
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300",
                action === "activate"
                  ? "bg-green-50 border-green-100"
                  : action === "deactivate"
                  ? "bg-orange-50 border-orange-100"
                  : "bg-red-50 border-red-100"
              )}
            >
              <div
                className={cn(
                  "transition-transform duration-300",
                  action === "activate" ? "animate-pulse" : ""
                )}
              >
                {config.icon}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">
                {config.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-center">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-600 text-center">
                {user.email}
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant={user.inSanity ? "default" : "outline"}>
                  <Database className="h-3 w-3 mr-1" />
                  {user.inSanity ? "In Sanity" : "Clerk Only"}
                </Badge>
                {user.notificationCount && user.notificationCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {user.notificationCount} notifications
                  </Badge>
                )}
              </div>
            </div>

            {/* Consequences */}
            <div
              className={cn(
                "p-4 rounded-lg border",
                action === "activate"
                  ? "bg-green-50 border-green-200"
                  : action === "deactivate"
                  ? "bg-orange-50 border-orange-200"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <h4
                className={cn(
                  "font-medium text-sm mb-3",
                  action === "activate"
                    ? "text-green-900"
                    : action === "deactivate"
                    ? "text-orange-900"
                    : "text-gray-900"
                )}
              >
                What will happen:
              </h4>
              <ul
                className={cn(
                  "text-sm space-y-2",
                  action === "activate"
                    ? "text-green-800"
                    : action === "deactivate"
                    ? "text-orange-800"
                    : "text-gray-900"
                )}
              >
                {config.consequences.map((consequence, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 font-bold",
                        action === "activate"
                          ? "text-green-400"
                          : action === "deactivate"
                          ? "text-orange-400"
                          : "text-gray-500"
                      )}
                    >
                      •
                    </span>
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warning for destructive actions */}
            {(action === "delete" ||
              (action === "deactivate" &&
                user.notificationCount &&
                user.notificationCount > 0)) && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 animate-pulse" />
                <div className="text-sm text-red-800">
                  {action === "delete"
                    ? "This action is permanent and cannot be undone. The user will lose all their Sanity data."
                    : `This user has received ${user.notificationCount} notifications. Deactivating will prevent future notifications.`}
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant={config.confirmVariant}
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 font-semibold shadow-lg",
                config.confirmVariant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 hover:shadow-red-200"
                  : "bg-shop_dark_green hover:bg-shop_btn_dark_green hover:shadow-green-200"
              )}
            >
              {isLoading ? "Processing..." : config.confirmText}
            </Button>
          </div>

          {/* Close Button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

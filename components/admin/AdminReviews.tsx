"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StarIcon,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Check,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getReviewsByStatusAPI,
  approveReviewAPI,
  rejectReviewAPI,
  AdminReview,
} from "@/lib/adminReviewAPI";
import { toast } from "sonner";
import Link from "next/link";

const AdminReviews: React.FC = React.memo(() => {
  const [pendingReviews, setPendingReviews] = useState<AdminReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPendingReviews = useCallback(async () => {
    try {
      const data = await getReviewsByStatusAPI("pending");
      setPendingReviews(data.reviews);
    } catch (error) {
      console.error("Error loading pending reviews:", error);
      toast.error("Failed to load pending reviews");
    }
  }, []);

  const loadApprovedReviews = useCallback(async () => {
    try {
      const data = await getReviewsByStatusAPI("approved");
      setApprovedReviews(data.reviews);
    } catch (error) {
      console.error("Error loading approved reviews:", error);
      toast.error("Failed to load approved reviews");
    }
  }, []);

  const loadAllReviews = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadPendingReviews(), loadApprovedReviews()]);
    setIsLoading(false);
  }, [loadPendingReviews, loadApprovedReviews]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadPendingReviews(), loadApprovedReviews()]);
      toast.success("Reviews refreshed successfully");
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      toast.error("Failed to refresh reviews");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPendingReviews, loadApprovedReviews]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  const handleApprove = useCallback(
    async (reviewId: string) => {
      setProcessingId(reviewId);
      try {
        const result = await approveReviewAPI(reviewId);
        if (result.success) {
          toast.success("Review approved successfully");
          await loadAllReviews();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error approving review:", error);
        toast.error("Failed to approve review");
      } finally {
        setProcessingId(null);
      }
    },
    [loadAllReviews]
  );

  const handleReject = useCallback(
    async (reviewId: string) => {
      setProcessingId(reviewId);
      try {
        const result = await rejectReviewAPI(reviewId, rejectNotes);
        if (result.success) {
          toast.success("Review rejected");
          setRejectNotes("");
          await loadAllReviews();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error rejecting review:", error);
        toast.error("Failed to reject review");
      } finally {
        setProcessingId(null);
      }
    },
    [rejectNotes, loadAllReviews]
  );

  const renderReviewCard = useCallback(
    (review: AdminReview, isPending: boolean = true) => (
      <Card key={review._id} className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* User Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={review.user?.profileImage?.asset?.url}
                alt={`${review.user?.firstName} ${review.user?.lastName}`}
              />
              <AvatarFallback className="bg-shop_light_green/10 text-shop_dark_green">
                {review.user?.firstName?.[0]}
                {review.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              {/* User Info & Product */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-shop_dark_green">
                    {review.user?.firstName} {review.user?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">{review.user?.email}</p>
                  <Link
                    href={`/product/${review.product?.slug}`}
                    className="text-sm text-shop_light_green hover:underline"
                    target="_blank"
                  >
                    {review.product?.name}
                  </Link>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {review.isVerifiedPurchase && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                      Verified Purchase
                    </Badge>
                  )}
                  {!isPending && (
                    <Badge className="bg-gray-100 text-gray-900 hover:bg-gray-200">
                      Approved
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    Submitted: {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                  {review.approvedAt && (
                    <span className="text-xs text-gray-400">
                      Approved:{" "}
                      {new Date(review.approvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, index) => (
                    <StarIcon
                      key={index}
                      size={16}
                      className={`${
                        index < review.rating
                          ? "text-shop_light_green fill-shop_light_green"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.rating} / 5</span>
              </div>

              {/* Review Content */}
              <h5 className="font-semibold mb-2">{review.title}</h5>
              <p className="text-gray-700 leading-relaxed mb-4">
                {review.content}
              </p>

              {/* Actions - Only show for pending reviews */}
              {isPending && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleApprove(review._id)}
                    disabled={processingId === review._id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle size={16} className="mr-1" />
                    {processingId === review._id ? "Processing..." : "Approve"}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={processingId === review._id}
                      >
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Review</DialogTitle>
                        <DialogDescription>
                          Add optional notes about why this review is being
                          rejected (for internal use only)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Admin notes (optional)..."
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setRejectNotes("")}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(review._id)}
                            disabled={processingId === review._id}
                          >
                            {processingId === review._id
                              ? "Processing..."
                              : "Reject Review"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye size={16} className="mr-1" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Review Preview</DialogTitle>
                        <DialogDescription>
                          How this review will appear on the product page
                        </DialogDescription>
                      </DialogHeader>
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={review.user?.profileImage?.asset?.url}
                              alt={`${review.user?.firstName} ${review.user?.lastName}`}
                            />
                            <AvatarFallback className="bg-shop_light_green/10 text-shop_dark_green">
                              {review.user?.firstName?.[0]}
                              {review.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-shop_dark_green">
                                {review.user?.firstName} {review.user?.lastName}
                              </h4>
                              {review.isVerifiedPurchase && (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, index) => (
                                  <StarIcon
                                    key={index}
                                    size={14}
                                    className={`${
                                      index < review.rating
                                        ? "text-shop_light_green fill-shop_light_green"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {new Date(
                                  review.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <h5 className="font-medium mb-2">{review.title}</h5>
                            <p className="text-gray-700 leading-relaxed">
                              {review.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              {!isPending && review.adminNotes && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                  <strong>Admin Notes:</strong> {review.adminNotes}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [processingId, rejectNotes, handleApprove, handleReject]
  );

  const ReviewSkeleton = () => (
    <Card className="border-2 animate-pulse">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar Skeleton */}
          <div className="h-12 w-12 rounded-full bg-gray-200" />

          <div className="flex-1 space-y-3">
            {/* User Info Skeleton */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-28 bg-gray-200 rounded-full" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Rating Skeleton */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 w-4 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-3 w-12 bg-gray-200 rounded" />
            </div>

            {/* Title Skeleton */}
            <div className="h-5 w-3/4 bg-gray-200 rounded" />

            {/* Content Skeleton */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex gap-3 pt-2">
              <div className="h-9 w-24 bg-gray-200 rounded" />
              <div className="h-9 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-shop_dark_green">
                Review Management
              </CardTitle>
              <CardDescription>
                Manage customer reviews - approve pending reviews and view
                approved ones
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock size={16} />
                Pending ({pendingReviews.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Check size={16} />
                Approved ({approvedReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No pending reviews</p>
                  <p className="text-sm">All reviews have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map((review) =>
                    renderReviewCard(review, true)
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              ) : approvedReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Check size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No approved reviews</p>
                  <p className="text-sm">No reviews have been approved yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedReviews.map((review) =>
                    renderReviewCard(review, false)
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

AdminReviews.displayName = "AdminReviews";

export default AdminReviews;

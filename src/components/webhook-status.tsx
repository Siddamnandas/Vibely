"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useWebhookHandler, simulateWebhookEvent } from "@/lib/webhook-service";

interface WebhookStatusProps {
  className?: string;
  showTestButtons?: boolean;
}

export function WebhookStatus({ className, showTestButtons = false }: WebhookStatusProps) {
  const { isProcessing, stats, clearQueue } = useWebhookHandler();

  const getStatusColor = () => {
    if (isProcessing) return "bg-blue-500";
    if (stats.queueLength > 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (isProcessing) return "Processing";
    if (stats.queueLength > 0) return "Queued";
    return "Ready";
  };

  const handleTestWebhook = (type: string) => {
    const testData = {
      payment: {
        id: `test_payment_${Date.now()}`,
        amount: 999,
        currency: "usd",
        status: "succeeded",
      },
      subscription: {
        id: `test_sub_${Date.now()}`,
        status: "active",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    };

    switch (type) {
      case "payment_success":
        simulateWebhookEvent("payment.succeeded", testData.payment);
        break;
      case "payment_failed":
        simulateWebhookEvent("payment.failed", { ...testData.payment, status: "failed" });
        break;
      case "subscription_created":
        simulateWebhookEvent("subscription.created", testData.subscription);
        break;
      case "subscription_updated":
        simulateWebhookEvent("subscription.updated", {
          ...testData.subscription,
          status: "active",
        });
        break;
      case "subscription_cancelled":
        simulateWebhookEvent("subscription.cancelled", {
          ...testData.subscription,
          status: "cancelled",
        });
        break;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Status
          <Badge variant="secondary" className={`ml-auto ${getStatusColor()} text-white`}>
            {getStatusText()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time payment and subscription webhook processing status
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Processing Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing Status</span>
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <>
                  <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-blue-600">Active</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Idle</span>
                </>
              )}
            </div>
          </div>

          {isProcessing && <Progress value={75} className="h-2" />}
        </div>

        {/* Queue Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.queueLength}</div>
            <div className="text-xs text-gray-500">Queued Events</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.totalProcessed}</div>
            <div className="text-xs text-gray-500">Processed</div>
          </div>
        </div>

        {/* Queue Management */}
        {stats.queueLength > 0 && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {stats.queueLength} event{stats.queueLength !== 1 ? "s" : ""} pending
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={clearQueue}
              className="text-yellow-700 border-yellow-300"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Error Status */}
        {stats.totalFailed > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">
              {stats.totalFailed} event{stats.totalFailed !== 1 ? "s" : ""} failed processing
            </span>
          </div>
        )}

        {/* Test Webhook Buttons */}
        {showTestButtons && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-900">Test Webhooks</h4>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestWebhook("payment_success")}
                className="text-green-700 border-green-300"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Payment Success
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestWebhook("payment_failed")}
                className="text-red-700 border-red-300"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Payment Failed
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestWebhook("subscription_created")}
                className="text-blue-700 border-blue-300"
              >
                New Subscription
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestWebhook("subscription_cancelled")}
                className="text-orange-700 border-orange-300"
              >
                Cancelled Sub
              </Button>
            </div>
          </div>
        )}

        {/* Webhook Health */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Webhooks automatically retry failed events</p>
          <p>• Events are processed in chronological order</p>
          <p>• Failed events are logged for debugging</p>
          <p>• Real-time updates sync across all devices</p>
        </div>
      </CardContent>
    </Card>
  );
}

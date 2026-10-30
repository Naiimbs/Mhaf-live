"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Video,
  Mic,
  MicOff,
  Camera,
  CheckCircle,
  Globe,
  Settings,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function InteractivePreview() {
  // Scheduling demo state
  const [selectedDuration, setSelectedDuration] = React.useState<number>(30);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>("14:30");
  const [bookingConfirmed, setBookingConfirmed] = React.useState(false);

  // Meeting staging demo state
  const [testMicActive, setTestMicActive] = React.useState(false);
  const [micVolume, setMicVolume] = React.useState(65);
  const [cameraActive, setCameraActive] = React.useState(true);

  // Time slots for interactive demo
  const timeSlots = ["09:00", "10:30", "11:15", "14:00", "14:30", "16:00", "17:15"];

  return (
    <section id="preview" className="py-20 bg-muted/20 border-y border-border/60">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            Interactive Prototype Preview
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Test the MHAF Live experience right here.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Experience how the autonomous scheduling engine and PreJoin room staging
            operate before initiating a live call.
          </p>
        </div>

        {/* Dual Tab Interface */}
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="scheduling" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="scheduling" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 1. Scheduling Flow
                </TabsTrigger>
                <TabsTrigger value="room-staging" className="flex items-center gap-2">
                  <Video className="h-4 w-4" /> 2. PreJoin Room Staging
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: SCHEDULING INTERACTION */}
            <TabsContent value="scheduling">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/60 p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          Cal.diy Algorithm Demo
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Auto-detected: UTC+1
                        </span>
                      </div>
                      <CardTitle className="text-xl sm:text-2xl mt-2">
                        Executive Consultation & Review
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Select a duration and choose an open slot to preview the instant booking flow.
                      </CardDescription>
                    </div>

                    {/* Duration Picker */}
                    <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                      {[15, 30, 45].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => {
                            setSelectedDuration(duration);
                            setBookingConfirmed(false);
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            selectedDuration === duration
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {duration} min
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8">
                  {!bookingConfirmed ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                          <Clock className="h-4 w-4 text-primary" /> Available Time Windows
                        </span>
                        <p className="text-xs text-muted-foreground mb-4">
                          Sample slots for this interactive preview. They are not fetched from a live host calendar.
                        </p>
                        <div className="grid grid-cols-3 gap-2.5">
                          {timeSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`h-10 rounded-md border text-xs font-mono font-medium transition-all ${
                                selectedSlot === slot
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-card hover:bg-muted text-foreground"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
                        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Booking Confirmation Summary
                        </span>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event:</span>
                            <span className="font-semibold text-foreground">
                              {selectedDuration}-Minute Architecture Sync
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Selected Time:</span>
                            <span className="font-mono font-semibold text-foreground">
                              Today at {selectedSlot ?? "None selected"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Meeting URL:</span>
                            <span className="font-mono text-xs text-primary">
                              mhaf.live/rooms/mhaf-30min
                            </span>
                          </div>
                        </div>

                        <Button
                          className="w-full mt-4"
                          onClick={() => setBookingConfirmed(true)}
                          disabled={!selectedSlot}
                        >
                          Preview booking confirmation
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <h4 className="text-lg font-bold text-foreground">
                        Booking Preview
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        This is a front-end demonstration only. No slot is reserved, no room is created, and no invitation is sent.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingConfirmed(false)}
                      >
                        Reset Demo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PREJOIN ROOM STAGING */}
            <TabsContent value="room-staging">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/60 p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="secondary" className="font-mono text-xs mb-1">
                        LiveKit PreJoin Pattern
                      </Badge>
                      <CardTitle className="text-xl sm:text-2xl mt-1">
                        Hardware Staging & Device Check
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Simulate camera framing, microphone level detection, and audio meter test before joining the room.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Simulated Camera Preview Frame */}
                    <div className="relative flex flex-col items-center justify-center aspect-video rounded-xl border border-border bg-muted/60 overflow-hidden shadow-inner">
                      {cameraActive ? (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary border border-border flex items-center justify-center text-xl font-bold mb-2">
                            YOU
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            Face Framing Good
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            HD Video Stream (Simulated Preview)
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Camera className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-xs">Camera is Off</span>
                        </div>
                      )}

                      {/* Overlaid status indicators */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-background/80 px-2 py-0.5 text-[10px] font-mono backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        720p 30fps
                      </div>
                    </div>

                    {/* Hardware Controls */}
                    <div className="space-y-4">
                      {/* Audio Level Simulation */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <Mic className="h-3.5 w-3.5 text-primary" /> Microphone Audio Level
                          </span>
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {testMicActive ? `${micVolume}%` : "Inactive"}
                          </span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-muted overflow-hidden p-0.5 border border-border">
                          <div
                            className={`h-full rounded-full transition-all duration-150 ${
                              testMicActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                            }`}
                            style={{ width: testMicActive ? `${micVolume}%` : "10%" }}
                          />
                        </div>
                      </div>

                      {/* Device Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                          variant={testMicActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setTestMicActive(!testMicActive);
                            setMicVolume(Math.floor(Math.random() * 40) + 50);
                          }}
                          className="flex-1 text-xs"
                        >
                          {testMicActive ? "Stop Mic Test" : "Test Audio Input"}
                        </Button>
                        <Button
                          variant={cameraActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => setCameraActive(!cameraActive)}
                          className="flex-1 text-xs"
                        >
                          {cameraActive ? "Turn Off Video" : "Enable Video"}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-foreground block">
                          Verified Integration Note:
                        </span>
                        Standard WebRTC PreJoin executes in browser sandbox via `navigator.mediaDevices.getUserMedia` before triggering token minting at `/api/connection-details`.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

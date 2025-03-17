
import { useState, useEffect } from "react";
import { useConversationSession } from "./conversation/useConversationSession";
import { useAttachments } from "./conversation/useAttachments";
import { useAssistantInteraction } from "./conversation/useAssistantInteraction";
import type { AssistantType } from "@/lib/types";

export function useConversations() {
  const {
    sessionId,
    conversations,
    loadConversations,
    startNewSession
  } = useConversationSession();

  const {
    attachments,
    uploadedAttachments,
    handleFileUpload,
    clearAttachments
  } = useAttachments();

  const {
    isLoading,
    threadId,
    structuredOutput,
    setStructuredOutput,
    latestResponse,
    handleLatestResponse,
    handleSearch,
    handleReply
  } = useAssistantInteraction(sessionId, loadConversations, uploadedAttachments, clearAttachments);

  return {
    isLoading,
    conversations,
    attachments,
    uploadedAttachments,
    threadId,
    structuredOutput,
    setStructuredOutput,
    sessionId,
    latestResponse,
    handleLatestResponse,
    handleFileUpload,
    clearAttachments,
    handleSearch,
    handleReply,
    startNewSession,
    loadConversations
  };
}

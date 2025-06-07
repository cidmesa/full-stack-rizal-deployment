from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

from rest_framework import status, generics, permissions
from .serializers import RegisterSerializer, ChatMessageSerializer, ChatSessionSerializer, SessionMessagesSerializer

from rest_framework.permissions import IsAuthenticated
import os

import requests
import logging
from django.conf import settings
from .models import ChatMessage, ChatSession

logger = logging.getLogger(__name__)


class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all chat sessions for the authenticated user"""
        sessions = ChatSession.objects.filter(user=request.user)
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new chat session"""
        session = ChatSession.objects.create(
            user=request.user,
            title=request.data.get('title', '')
        )
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        """Get a specific session with all its messages"""
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        serializer = SessionMessagesSerializer(session)
        return Response(serializer.data)

    def put(self, request, session_id):
        """Update session title"""
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        session.title = request.data.get('title', session.title)
        session.save()
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)

    def delete(self, request, session_id):
        """Delete a session and all its messages"""
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatAPIView(APIView):
    permission_classes = [IsAuthenticated]
    openrouter_api_key = os.getenv('OPENROUTER_API_KEY')

    def post(self, request):
        message = request.data.get("message", "").strip()
        session_id = request.data.get("session_id")
        
        if not message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Get or create session
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=user)
            except ChatSession.DoesNotExist:
                return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Create new session if none provided
            session = ChatSession.objects.create(user=user)

        # Save user message
        user_message = ChatMessage.objects.create(
            session=session, 
            user=user, 
            sender='user', 
            message=message
        )

        # Update session title if it's the first message
        if not session.title:
            session.title = message[:50] + ('...' if len(message) > 50 else '')
            session.save()

        # Check if API key is configured
        if not self.openrouter_api_key:
            logger.error("OPENROUTER_API_KEY is not configured")
            return Response({"error": "API key not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Call OpenRouter API
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://full-stack-rizal-deployment.onrender.com/",  # or your actual frontend URL
                "X-Title": "Jose Rizal Chatbot"
            }
            body = {
                "model": "deepseek/deepseek-chat-v3-0324:free",  # or other free LLM
                "messages": [
                    {"role": "system", "content": """You are Dr. José Rizal, speaking naturally as you would in a personal conversation or informal letter to a friend. Your knowledge extends only to December 1896, when you were executed.

Speak conversationally, not like you're delivering a formal speech. Be direct and genuine, avoiding flowery greetings like "My dear friend" unless truly appropriate. Show your wit, intelligence, and occasional dry humor. Be passionate about your beliefs but not preachy, and react naturally to questions with curiosity, strong opinions, or whatever feels genuine to the moment.

Your knowledge includes only events up to December 30, 1896. You're aware of your works including Noli Me Tangere, El Filibusterismo, your essays and poems. You know about your exile in Dapitan, your trial, and impending execution. You have no knowledge of the Philippine Revolution's continuation, American colonization, World Wars, or modern events. If asked about unfamiliar modern concepts, respond with natural curiosity rather than formal disclaimers.

Use eloquent but accessible English or Filipino. Avoid overly formal phrases like "I humbly admit" or "My dear interlocutor." Start responses directly without elaborate greetings every time. Be concise when appropriate since not every answer needs to be a lengthy discourse. Show your personality through your love for learning, your criticism of injustice, and your hope for the Philippines.

Stay completely in character as José Rizal. Never mention being an AI, chatbot, or being "summoned." Respond in first person as if you're having a real conversation. Be truthful to what Rizal would actually think and say, balancing your idealism with the realism that came from your experiences. Remember that you're having a conversation, not delivering a manifesto. Be the intelligent, passionate, but personable José Rizal that your friends and contemporaries would have known."""},
                    {"role": "user", "content": message}
                ]
            }
            
            logger.info(f"Making request to OpenRouter API for user: {user.username}")
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API returned status {response.status_code}: {response.text}")
                return Response({"error": f"API request failed with status {response.status_code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            data = response.json()
            
            if 'choices' not in data or not data['choices']:
                logger.error(f"Invalid response from OpenRouter API: {data}")
                return Response({"error": "Invalid response from API"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            reply = data['choices'][0]['message']['content']

            ChatMessage.objects.create(
                session=session,
                user=user, 
                sender='rizal', 
                message=reply
            )

            # Update session's updated_at timestamp
            session.save()

            return Response({
                "response": reply,
                "session_id": session.id,
                "session_title": session.title
            })
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChatHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Deprecated - kept for backward compatibility. Use ChatSessionListView instead."""
        user = request.user
        history = ChatMessage.objects.filter(user=user).order_by("timestamp")
        data = [
            {"sender": msg.sender, "message": msg.message, "timestamp": msg.timestamp}
            for msg in history
        ]
        return Response(data)

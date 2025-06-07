from django.urls import path
from .views import (
    ChatAPIView, 
    RegisterView, 
    ChatHistoryAPIView, 
    ChatSessionListView, 
    ChatSessionDetailView,
    ChatSessionTruncateView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('chat/', ChatAPIView.as_view(), name='chat'),
    path('register/', RegisterView.as_view()),
    path('token/', TokenObtainPairView.as_view()),        # login
    path('token/refresh/', TokenRefreshView.as_view()),   # refresh
    path('chat/history/', ChatHistoryAPIView.as_view(), name='chat-history'),  # deprecated
    
    # New session-based endpoints
    path('sessions/', ChatSessionListView.as_view(), name='chat-sessions'),
    path('sessions/<int:session_id>/', ChatSessionDetailView.as_view(), name='chat-session-detail'),
    path('sessions/<int:session_id>/truncate/', ChatSessionTruncateView.as_view(), name='chat-session-truncate'),
]

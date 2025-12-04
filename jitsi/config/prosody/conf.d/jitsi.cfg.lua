-- Prosody configuration for local Jitsi server

-- Server configuration
admins = { }

-- Set the hostname of the server
VirtualHost "meet.jitsi"

-- Configure authentication
authentication = "internal_hashed"

-- Main MUC (multi-user chat) component
Component "muc.meet.jitsi" "muc"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        -- Add other modules as needed
    }
    admins = { "focus@auth.meet.jitsi", "jvb@auth.meet.jitsi" }
    muc_room_cache_size = 1000
    muc_room_locking = false
    muc_room_default_public = true
    muc_room_default_options = { 
        members_only = false,
        moderated = false,
        public = true 
    }

-- Internal MUC for components
Component "internal-muc.meet.jitsi" "muc"
    modules_enabled = {
        "muc_meeting_id";
    }
    admins = { "focus@auth.meet.jitsi", "jvb@auth.meet.jitsi" }

-- Authentication component
VirtualHost "auth.meet.jitsi"
    modules_enabled = { "null_auth" }

-- Guest domain (for unauthenticated users)
VirtualHost "guest.meet.jitsi"
    modules_enabled = { "bosh" }
    authentication = "anonymous"
    c2s_require_encryption = false

-- Focus component
Component "focus.meet.jitsi"
    modules_enabled = { "focus_muc_mapper" }

-- JVB component
Component "jvb.meet.jitsi"
    modules_enabled = { "ping" }
    c2s_require_encryption = false
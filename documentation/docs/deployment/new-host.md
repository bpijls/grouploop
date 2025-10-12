# Deploying GroupLoop on a New Host

This guide provides step-by-step instructions for deploying the GroupLoop system on a new host, including server setup, configuration, and maintenance.

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum free space
- **Network**: Static IP address recommended

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl/wget
- Basic firewall configuration

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git ufw

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5003/tcp  # WebSocket server
sudo ufw allow 5004/tcp  # Client UI
sudo ufw allow 5008/tcp  # CDN server
sudo ufw --force enable
```

### 2. Install Docker

```bash
# Remove old Docker versions
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Configure Docker

```bash
# Create Docker daemon configuration
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Restart Docker
sudo systemctl restart docker
sudo systemctl enable docker
```

## GroupLoop Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/grouploop
sudo chown $USER:$USER /opt/grouploop
cd /opt/grouploop

# Clone repository
git clone <repository-url> .

# Set proper permissions
chmod +x scripts/*.sh
```

### 2. Environment Configuration

```bash
# Create production environment file
cp config-templates/production.env .env

# Edit configuration
nano .env
```

**Production Environment Template**:
```bash
# .env
# WebSocket server configuration
WS_DEFAULT_URL=wss://your-domain.com/socket
CDN_BASE_URL=https://your-domain.com/cdn

# Service ports
SOCKET_PORT=5003
CLIENT_PORT=5004
SIMULATOR_PORT=5005
DOCS_PORT=5006
EMULATOR_PORT=5007
CDN_PORT=5008
CONTROL_PORT=5009

# Security
DEBUG=0
LOG_LEVEL=warning
```

### 3. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Create certificate directory
sudo mkdir -p /opt/grouploop/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/grouploop/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/grouploop/ssl/
sudo chown -R $USER:$USER /opt/grouploop/ssl
```

### 4. Reverse Proxy Configuration

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/grouploop > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /opt/grouploop/ssl/fullchain.pem;
    ssl_certificate_key /opt/grouploop/ssl/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # WebSocket server
    location /socket/ {
        proxy_pass http://localhost:5003/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Client UI
    location /client/ {
        proxy_pass http://localhost:5004/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # CDN server
    location /cdn/ {
        proxy_pass http://localhost:5008/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Documentation
    location /docs/ {
        proxy_pass http://localhost:5006/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Device control
    location /control/ {
        proxy_pass http://localhost:5009/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/grouploop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. Deploy Services

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up --build -d

# Verify services are running
docker-compose ps
```

## System Service Configuration

### 1. Create Systemd Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/grouploop.service > /dev/null <<EOF
[Unit]
Description=GroupLoop Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/grouploop
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable grouploop
sudo systemctl start grouploop
```

### 2. Create Update Script

```bash
# Create update script
tee /opt/grouploop/update.sh > /dev/null <<EOF
#!/bin/bash
set -e

echo "Updating GroupLoop..."

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d

# Clean up old images
docker image prune -f

echo "Update complete!"
EOF

chmod +x /opt/grouploop/update.sh
```

## Monitoring and Maintenance

### 1. Health Monitoring

```bash
# Create health check script
tee /opt/grouploop/health-check.sh > /dev/null <<EOF
#!/bin/bash

# Check if services are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "ERROR: Some services are not running"
    exit 1
fi

# Check WebSocket server health
if ! curl -f http://localhost:5003/health > /dev/null 2>&1; then
    echo "ERROR: WebSocket server is not responding"
    exit 1
fi

# Check CDN server
if ! curl -f http://localhost:5008/ > /dev/null 2>&1; then
    echo "ERROR: CDN server is not responding"
    exit 1
fi

echo "All services are healthy"
EOF

chmod +x /opt/grouploop/health-check.sh
```

### 2. Log Management

```bash
# Create log rotation script
sudo tee /etc/logrotate.d/grouploop > /dev/null <<EOF
/opt/grouploop/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /opt/grouploop/docker-compose.prod.yml restart
    endscript
}
EOF
```

### 3. Backup Configuration

```bash
# Create backup script
tee /opt/grouploop/backup.sh > /dev/null <<EOF
#!/bin/bash

BACKUP_DIR="/opt/backups/grouploop"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env docker-compose.prod.yml ssl/

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /opt/grouploop/backup.sh
```

## Security Configuration

### 1. Firewall Rules

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Fail2Ban Configuration

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 3. SSL Certificate Renewal

```bash
# Create renewal script
sudo tee /opt/grouploop/renew-ssl.sh > /dev/null <<EOF
#!/bin/bash

# Renew certificate
certbot renew --quiet

# Copy new certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/grouploop/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/grouploop/ssl/

# Restart services
docker-compose -f /opt/grouploop/docker-compose.prod.yml restart

# Reload Nginx
systemctl reload nginx
EOF

sudo chmod +x /opt/grouploop/renew-ssl.sh

# Add to crontab
echo "0 2 * * * /opt/grouploop/renew-ssl.sh" | sudo crontab -
```

## Performance Optimization

### 1. Docker Optimization

```bash
# Create Docker daemon configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false
}
EOF

sudo systemctl restart docker
```

### 2. System Optimization

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check service status
sudo systemctl status grouploop

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs

# Check system resources
free -h
df -h
```

#### 2. SSL Certificate Issues

```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Check certificate expiration
openssl x509 -in /opt/grouploop/ssl/fullchain.pem -text -noout | grep "Not After"
```

#### 3. Network Issues

```bash
# Test connectivity
curl -I https://your-domain.com
curl -I https://your-domain.com/socket/health

# Check firewall
sudo ufw status
```

### Recovery Procedures

#### 1. Service Recovery

```bash
# Restart all services
sudo systemctl restart grouploop

# Force rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

#### 2. Configuration Recovery

```bash
# Restore from backup
tar -xzf /opt/backups/grouploop/config_YYYYMMDD_HHMMSS.tar.gz

# Restart services
sudo systemctl restart grouploop
```

## Maintenance Schedule

### Daily Tasks

- Check service health
- Monitor disk space
- Review error logs

### Weekly Tasks

- Update system packages
- Clean Docker images
- Backup configuration

### Monthly Tasks

- Security updates
- Performance review
- Certificate renewal check

## Support and Documentation

### Useful Commands

```bash
# Service management
sudo systemctl status grouploop
sudo systemctl restart grouploop
sudo systemctl stop grouploop

# Docker management
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
docker-compose -f docker-compose.prod.yml restart

# System monitoring
htop
iotop
netstat -tulpn
```

### Log Locations

- **Application logs**: `/opt/grouploop/logs/`
- **System logs**: `/var/log/syslog`
- **Nginx logs**: `/var/log/nginx/`
- **Docker logs**: `docker-compose logs`

### Contact Information

- **Documentation**: https://your-domain.com/docs/
- **Health Check**: https://your-domain.com/socket/health
- **Support**: [Your support contact information]

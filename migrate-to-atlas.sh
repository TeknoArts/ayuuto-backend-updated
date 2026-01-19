#!/bin/bash

# MongoDB Migration Script: Local to Atlas
# This script exports your local MongoDB database and imports it to MongoDB Atlas

# ============================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================

# Local MongoDB connection
LOCAL_URI="mongodb://localhost:27017/ayuuto"

# MongoDB Atlas connection string
# Get this from: MongoDB Atlas → Connect → Connect your application
# Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ayuuto?retryWrites=true&w=majority
ATLAS_URI="mongodb+srv://technoarts165_db_user:<db_password>@cluster0.z4bzsxf.mongodb.net/ayuuto?appName=Cluster0"

# Backup directory
BACKUP_DIR="./backup-$(date +%Y%m%d-%H%M%S)"

# ============================================
# SCRIPT STARTS HERE
# ============================================

echo "🚀 MongoDB Migration: Local to Atlas"
echo "======================================"
echo ""

# Check if mongodump is installed
if ! command -v mongodump &> /dev/null; then
    echo "❌ mongodump is not installed!"
    echo "   Install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Check if mongorestore is installed
if ! command -v mongorestore &> /dev/null; then
    echo "❌ mongorestore is not installed!"
    echo "   Install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Step 1: Export local database
echo "📦 Step 1: Exporting local database..."
echo "   Source: $LOCAL_URI"
echo "   Backup: $BACKUP_DIR"
echo ""

mongodump --uri="$LOCAL_URI" --out="$BACKUP_DIR"

if [ $? -ne 0 ]; then
    echo "❌ Export failed!"
    echo "   Troubleshooting:"
    echo "   1. Make sure local MongoDB is running"
    echo "   2. Check connection string: $LOCAL_URI"
    echo "   3. Verify database name is correct"
    exit 1
fi

echo "✅ Export successful!"
echo ""

# Step 2: Import to Atlas
echo "📤 Step 2: Importing to MongoDB Atlas..."
echo "   Target: $ATLAS_URI"
echo ""

# Check if ATLAS_URI has been updated
if [[ "$ATLAS_URI" == *"username:password"* ]]; then
    echo "⚠️  WARNING: ATLAS_URI contains placeholder values!"
    echo "   Please update ATLAS_URI in this script with your actual credentials"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled."
        exit 1
    fi
fi

mongorestore --uri="$ATLAS_URI" "$BACKUP_DIR/ayuuto"

if [ $? -ne 0 ]; then
    echo "❌ Import failed!"
    echo "   Troubleshooting:"
    echo "   1. Check MongoDB Atlas connection string"
    echo "   2. Verify username and password are correct"
    echo "   3. Check MongoDB Atlas → Network Access (add your IP or 0.0.0.0/0)"
    echo "   4. Make sure database name matches: ayuuto"
    exit 1
fi

echo "✅ Import successful!"
echo ""

# Step 3: Summary
echo "🎉 Migration completed successfully!"
echo ""
echo "📊 Summary:"
echo "   - Local database exported to: $BACKUP_DIR"
echo "   - Data imported to MongoDB Atlas"
echo ""
echo "📝 Next steps:"
echo "   1. Verify data in MongoDB Atlas dashboard"
echo "   2. Update Railway MONGODB_URI environment variable"
echo "   3. Test your app with the new database"
echo ""

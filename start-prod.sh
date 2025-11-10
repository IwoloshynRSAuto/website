#!/bin/bash
cd /opt/timekeeping-portal
export $(grep -v '^#' .env.production | xargs)
npm start

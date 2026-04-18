from datetime import datetime
from backend.auth.models import db, AlertLog

VALID_LEVELS = ['info', 'warning', 'critical']

def create_alert(level: str, message: str, source: str = 'system'):
    if level not in VALID_LEVELS:
        raise ValueError(f'Invalid level: {level}')

    alert = AlertLog(
        level=level,
        message=message,
        source=source,
        timestamp=datetime.utcnow()
    )
    db.session.add(alert)
    db.session.commit()
    return alert

def get_alerts(level=None, limit=100):
    query = AlertLog.query
    if level:
        query = query.filter_by(level=level)
    return query.order_by(AlertLog.timestamp.desc()).limit(limit).all()

def get_alert_stats():
    total = AlertLog.query.count()
    info = AlertLog.query.filter_by(level='info').count()
    warning = AlertLog.query.filter_by(level='warning').count()
    critical = AlertLog.query.filter_by(level='critical').count()
    return {
        'total': total,
        'info': info,
        'warning': warning,
        'critical': critical
    }

def delete_alert(alert_id: int):
    alert = AlertLog.query.get(alert_id)
    if not alert:
        return False
    db.session.delete(alert)
    db.session.commit()
    return True

def serialize_alert(alert):
    return {
        'id': alert.id,
        'level': alert.level,
        'message': alert.message,
        'source': alert.source,
        'timestamp': alert.timestamp.isoformat()
    }

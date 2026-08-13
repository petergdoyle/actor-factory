import sqlite3
import json
from typing import List, Optional
from uuid import UUID

from src.actor_factory.models.core import CapabilityIngredient, DomainActorProfile
from src.actor_factory.storage.base import IStorageLayer

class SQLiteStorage(IStorageLayer):
    def __init__(self, db_path: str = "actor_factory.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS capabilities (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    ingredient_type TEXT NOT NULL,
                    core_logic_instruction TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profiles (
                    id TEXT PRIMARY KEY,
                    actor_name TEXT NOT NULL,
                    base_persona_id TEXT NOT NULL,
                    specializations_ids TEXT NOT NULL,
                    skill_id TEXT NOT NULL
                )
            """)
            conn.commit()

    def get_capability(self, capability_id: UUID) -> Optional[CapabilityIngredient]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, ingredient_type, core_logic_instruction FROM capabilities WHERE id = ?", (str(capability_id),))
            row = cursor.fetchone()
            if row:
                return CapabilityIngredient(
                    id=UUID(row[0]),
                    name=row[1],
                    ingredient_type=row[2],
                    core_logic_instruction=row[3]
                )
            return None

    def list_capabilities(self) -> List[CapabilityIngredient]:
        capabilities = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, ingredient_type, core_logic_instruction FROM capabilities")
            for row in cursor.fetchall():
                capabilities.append(
                    CapabilityIngredient(
                        id=UUID(row[0]),
                        name=row[1],
                        ingredient_type=row[2],
                        core_logic_instruction=row[3]
                    )
                )
        return capabilities

    def save_capability(self, capability: CapabilityIngredient) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO capabilities (id, name, ingredient_type, core_logic_instruction) VALUES (?, ?, ?, ?)",
                (str(capability.id), capability.name, capability.ingredient_type, capability.core_logic_instruction)
            )
            conn.commit()

    def get_profile(self, profile_id: UUID) -> Optional[DomainActorProfile]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, actor_name, base_persona_id, specializations_ids, skill_id FROM profiles WHERE id = ?", (str(profile_id),))
            row = cursor.fetchone()
            if row:
                base_persona = self.get_capability(UUID(row[2]))
                skill = self.get_capability(UUID(row[4]))
                
                spec_ids = json.loads(row[3])
                specializations = []
                for sid in spec_ids:
                    spec = self.get_capability(UUID(sid))
                    if spec:
                        specializations.append(spec)
                
                if not base_persona or not skill:
                    return None
                    
                return DomainActorProfile(
                    id=UUID(row[0]),
                    actor_name=row[1],
                    base_persona=base_persona,
                    specializations=specializations,
                    skill=skill
                )
            return None

    def list_profiles(self) -> List[DomainActorProfile]:
        profiles = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM profiles")
            for row in cursor.fetchall():
                profile = self.get_profile(UUID(row[0]))
                if profile:
                    profiles.append(profile)
        return profiles

    def save_profile(self, profile: DomainActorProfile) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            spec_ids = json.dumps([str(cap.id) for cap in profile.specializations])
            
            cursor.execute(
                "INSERT OR REPLACE INTO profiles (id, actor_name, base_persona_id, specializations_ids, skill_id) VALUES (?, ?, ?, ?, ?)",
                (str(profile.id), profile.actor_name, str(profile.base_persona.id), spec_ids, str(profile.skill.id))
            )
            
            self.save_capability(profile.base_persona)
            self.save_capability(profile.skill)
            for spec in profile.specializations:
                self.save_capability(spec)
                
            conn.commit()

import sqlite3
import json
from typing import List, Optional
from uuid import UUID

from src.actor_factory.models.core import (
    CapabilityIngredient,
    DomainActorProfile,
    Domain,
    Actor,
    Skill,
    Specialization,
    Composition,
    LLMProviderConfig,
)
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
            # Legacy tables
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

            # New rich entity tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS domains (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    parameters_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS actors (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    domain_id TEXT,
                    core_concerns_json TEXT NOT NULL,
                    vocabulary TEXT,
                    thinking_patterns_json TEXT NOT NULL,
                    quality_criteria_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS skills (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    output_format TEXT,
                    validation_level TEXT NOT NULL,
                    validation_rules_json TEXT NOT NULL,
                    quality_patterns_json TEXT NOT NULL,
                    anti_patterns_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS specializations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    services_and_patterns TEXT,
                    constraints_json TEXT NOT NULL,
                    examples_json TEXT NOT NULL,
                    detection_keywords_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS compositions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    skill_ids_json TEXT NOT NULL,
                    specialization_ids_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS llm_configs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    provider_type TEXT NOT NULL,
                    base_url TEXT,
                    api_key TEXT,
                    active_model TEXT NOT NULL,
                    is_active INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    available_models_json TEXT NOT NULL
                )
            """)
            conn.commit()

    # ──────────────────────────────────────────────
    # DOMAIN CRUD
    # ──────────────────────────────────────────────
    def list_domains(self) -> List[Domain]:
        domains = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description, parameters_json FROM domains")
            for row in cursor.fetchall():
                domains.append(
                    Domain(
                        id=UUID(row[0]),
                        name=row[1],
                        description=row[2] or "",
                        parameters=json.loads(row[3] or "{}")
                    )
                )
        return domains

    def get_domain(self, domain_id: UUID) -> Optional[Domain]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description, parameters_json FROM domains WHERE id = ?", (str(domain_id),))
            row = cursor.fetchone()
            if row:
                return Domain(
                    id=UUID(row[0]),
                    name=row[1],
                    description=row[2] or "",
                    parameters=json.loads(row[3] or "{}")
                )
            return None

    def save_domain(self, domain: Domain) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO domains (id, name, description, parameters_json) VALUES (?, ?, ?, ?)",
                (str(domain.id), domain.name, domain.description, json.dumps(domain.parameters))
            )
            conn.commit()

    def delete_domain(self, domain_id: UUID) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM domains WHERE id = ?", (str(domain_id),))
            conn.commit()

    # ──────────────────────────────────────────────
    # ACTOR CRUD
    # ──────────────────────────────────────────────
    def list_actors(self) -> List[Actor]:
        actors = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, title, description, domain_id, core_concerns_json, vocabulary, thinking_patterns_json, quality_criteria_json
                FROM actors
            """)
            for row in cursor.fetchall():
                actors.append(
                    Actor(
                        id=UUID(row[0]),
                        name=row[1],
                        title=row[2] or "",
                        description=row[3] or "",
                        domain_id=UUID(row[4]) if row[4] else None,
                        core_concerns=json.loads(row[5] or "[]"),
                        vocabulary=row[6] or "",
                        thinking_patterns=json.loads(row[7] or "[]"),
                        quality_criteria=json.loads(row[8] or "[]")
                    )
                )
        return actors

    def get_actor(self, actor_id: UUID) -> Optional[Actor]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, title, description, domain_id, core_concerns_json, vocabulary, thinking_patterns_json, quality_criteria_json
                FROM actors WHERE id = ?
            """, (str(actor_id),))
            row = cursor.fetchone()
            if row:
                return Actor(
                    id=UUID(row[0]),
                    name=row[1],
                    title=row[2] or "",
                    description=row[3] or "",
                    domain_id=UUID(row[4]) if row[4] else None,
                    core_concerns=json.loads(row[5] or "[]"),
                    vocabulary=row[6] or "",
                    thinking_patterns=json.loads(row[7] or "[]"),
                    quality_criteria=json.loads(row[8] or "[]")
                )
            return None

    def save_actor(self, actor: Actor) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO actors 
                   (id, name, title, description, domain_id, core_concerns_json, vocabulary, thinking_patterns_json, quality_criteria_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(actor.id),
                    actor.name,
                    actor.title,
                    actor.description,
                    str(actor.domain_id) if actor.domain_id else None,
                    json.dumps(actor.core_concerns),
                    actor.vocabulary,
                    json.dumps(actor.thinking_patterns),
                    json.dumps(actor.quality_criteria)
                )
            )
            conn.commit()

    def delete_actor(self, actor_id: UUID) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM actors WHERE id = ?", (str(actor_id),))
            conn.commit()

    # ──────────────────────────────────────────────
    # SKILL CRUD
    # ──────────────────────────────────────────────
    def list_skills(self) -> List[Skill]:
        skills = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, description, output_format, validation_level, validation_rules_json, quality_patterns_json, anti_patterns_json
                FROM skills
            """)
            for row in cursor.fetchall():
                skills.append(
                    Skill(
                        id=UUID(row[0]),
                        name=row[1],
                        description=row[2] or "",
                        output_format=row[3] or "",
                        validation_level=row[4] or "heuristic",
                        validation_rules=json.loads(row[5] or "[]"),
                        quality_patterns=json.loads(row[6] or "[]"),
                        anti_patterns=json.loads(row[7] or "[]")
                    )
                )
        return skills

    def get_skill(self, skill_id: UUID) -> Optional[Skill]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, description, output_format, validation_level, validation_rules_json, quality_patterns_json, anti_patterns_json
                FROM skills WHERE id = ?
            """, (str(skill_id),))
            row = cursor.fetchone()
            if row:
                return Skill(
                    id=UUID(row[0]),
                    name=row[1],
                    description=row[2] or "",
                    output_format=row[3] or "",
                    validation_level=row[4] or "heuristic",
                    validation_rules=json.loads(row[5] or "[]"),
                    quality_patterns=json.loads(row[6] or "[]"),
                    anti_patterns=json.loads(row[7] or "[]")
                )
            return None

    def save_skill(self, skill: Skill) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO skills 
                   (id, name, description, output_format, validation_level, validation_rules_json, quality_patterns_json, anti_patterns_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(skill.id),
                    skill.name,
                    skill.description,
                    skill.output_format,
                    skill.validation_level,
                    json.dumps(skill.validation_rules),
                    json.dumps(skill.quality_patterns),
                    json.dumps(skill.anti_patterns)
                )
            )
            conn.commit()

    def delete_skill(self, skill_id: UUID) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM skills WHERE id = ?", (str(skill_id),))
            conn.commit()

    # ──────────────────────────────────────────────
    # SPECIALIZATION CRUD
    # ──────────────────────────────────────────────
    def list_specializations(self) -> List[Specialization]:
        specs = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, description, services_and_patterns, constraints_json, examples_json, detection_keywords_json
                FROM specializations
            """)
            for row in cursor.fetchall():
                specs.append(
                    Specialization(
                        id=UUID(row[0]),
                        name=row[1],
                        description=row[2] or "",
                        services_and_patterns=row[3] or "",
                        constraints=json.loads(row[4] or "[]"),
                        examples=json.loads(row[5] or "[]"),
                        detection_keywords=json.loads(row[6] or "[]")
                    )
                )
        return specs

    def get_specialization(self, spec_id: UUID) -> Optional[Specialization]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, description, services_and_patterns, constraints_json, examples_json, detection_keywords_json
                FROM specializations WHERE id = ?
            """, (str(spec_id),))
            row = cursor.fetchone()
            if row:
                return Specialization(
                    id=UUID(row[0]),
                    name=row[1],
                    description=row[2] or "",
                    services_and_patterns=row[3] or "",
                    constraints=json.loads(row[4] or "[]"),
                    examples=json.loads(row[5] or "[]"),
                    detection_keywords=json.loads(row[6] or "[]")
                )
            return None

    def save_specialization(self, spec: Specialization) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO specializations
                   (id, name, description, services_and_patterns, constraints_json, examples_json, detection_keywords_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(spec.id),
                    spec.name,
                    spec.description,
                    spec.services_and_patterns,
                    json.dumps(spec.constraints),
                    json.dumps(spec.examples),
                    json.dumps(spec.detection_keywords)
                )
            )
            conn.commit()

    def delete_specialization(self, spec_id: UUID) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM specializations WHERE id = ?", (str(spec_id),))
            conn.commit()

    # ──────────────────────────────────────────────
    # COMPOSITION CRUD
    # ──────────────────────────────────────────────
    def list_compositions(self) -> List[Composition]:
        comps = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, actor_id, skill_ids_json, specialization_ids_json FROM compositions")
            for row in cursor.fetchall():
                comps.append(
                    Composition(
                        id=UUID(row[0]),
                        name=row[1],
                        actor_id=UUID(row[2]),
                        skill_ids=[UUID(s) for s in json.loads(row[3] or "[]")],
                        specialization_ids=[UUID(s) for s in json.loads(row[4] or "[]")]
                    )
                )
        return comps

    def get_composition(self, comp_id: UUID) -> Optional[Composition]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, actor_id, skill_ids_json, specialization_ids_json FROM compositions WHERE id = ?", (str(comp_id),))
            row = cursor.fetchone()
            if row:
                return Composition(
                    id=UUID(row[0]),
                    name=row[1],
                    actor_id=UUID(row[2]),
                    skill_ids=[UUID(s) for s in json.loads(row[3] or "[]")],
                    specialization_ids=[UUID(s) for s in json.loads(row[4] or "[]")]
                )
            return None

    def save_composition(self, comp: Composition) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO compositions (id, name, actor_id, skill_ids_json, specialization_ids_json) VALUES (?, ?, ?, ?, ?)",
                (
                    str(comp.id),
                    comp.name,
                    str(comp.actor_id),
                    json.dumps([str(s) for s in comp.skill_ids]),
                    json.dumps([str(s) for s in comp.specialization_ids])
                )
            )
            conn.commit()

    def delete_composition(self, comp_id: UUID) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM compositions WHERE id = ?", (str(comp_id),))
            conn.commit()

    # ──────────────────────────────────────────────
    # LLM PROVIDER CONFIG CRUD
    # ──────────────────────────────────────────────
    def list_llm_configs(self) -> List[LLMProviderConfig]:
        configs = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, provider_type, base_url, api_key, active_model, is_active, status, available_models_json
                FROM llm_configs
            """)
            for row in cursor.fetchall():
                configs.append(
                    LLMProviderConfig(
                        id=row[0],
                        name=row[1],
                        provider_type=row[2],
                        base_url=row[3],
                        api_key=row[4],
                        active_model=row[5],
                        is_active=bool(row[6]),
                        status=row[7],
                        available_models=json.loads(row[8] or "[]")
                    )
                )
        return configs

    def get_llm_config(self, config_id: str) -> Optional[LLMProviderConfig]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, provider_type, base_url, api_key, active_model, is_active, status, available_models_json
                FROM llm_configs WHERE id = ?
            """, (config_id,))
            row = cursor.fetchone()
            if row:
                return LLMProviderConfig(
                    id=row[0],
                    name=row[1],
                    provider_type=row[2],
                    base_url=row[3],
                    api_key=row[4],
                    active_model=row[5],
                    is_active=bool(row[6]),
                    status=row[7],
                    available_models=json.loads(row[8] or "[]")
                )
            return None

    def save_llm_config(self, config: LLMProviderConfig) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # If this config is set active, deactivate others
            if config.is_active:
                cursor.execute("UPDATE llm_configs SET is_active = 0")

            cursor.execute(
                """INSERT OR REPLACE INTO llm_configs
                   (id, name, provider_type, base_url, api_key, active_model, is_active, status, available_models_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    config.id,
                    config.name,
                    config.provider_type,
                    config.base_url,
                    config.api_key,
                    config.active_model,
                    1 if config.is_active else 0,
                    config.status,
                    json.dumps(config.available_models)
                )
            )
            conn.commit()

    def delete_llm_config(self, config_id: str) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM llm_configs WHERE id = ?", (config_id,))
            conn.commit()

    # ──────────────────────────────────────────────
    # LEGACY METHODS (CapabilityIngredient / DomainActorProfile)
    # ──────────────────────────────────────────────
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

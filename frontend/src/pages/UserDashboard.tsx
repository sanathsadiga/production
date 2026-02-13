import React, { useState, useEffect, useRef } from "react";
import { UserNavbar } from "../components/Navbar";
import { masterAPI, productionAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/user-dashboard.css";

// Type definitions
interface Publication {
  id: number;
  name: string;
  code: string;
  publication_type?: string; // VK, OSP, NAMMA
  location?: string; // ✅ Added location field
}

interface Machine {
  id: number;
  name: string;
  code: string;
}

interface DowntimeReason {
  id: number;
  reason: string;
  name?: string;
  code?: string;
}

interface NewsprintType {
  id: number;
  name: string;
  code: string;
}

interface ProductionRecord {
  id: number;
  user_id: number;
  publication_id: number | null;
  custom_publication_name: string | null;
  po_number: number;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  downtime_entries: Array<{
    downtime_reason_id: number;
    downtime_duration: string;
  }>;
  newsprint_id: number | null;
  newsprint_kgs: number;
  plate_consumption: number;
  page_wastes: number;
  wastes?: number; // Legacy field
  remarks: string;
  record_date: string;
  created_at: string;
}

// Separate type for edit form data with string IDs from form inputs
interface EditFormData {
  id: number;
  user_id: number;
  publication_id: number | null;
  custom_publication_name: string | null | undefined;
  po_number: number | string;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number | string;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  downtime_entries: Array<{
    downtime_reason_id: string | number;
    downtime_duration: string;
  }>;
  newsprint_id: number | string | null;
  newsprint_kgs: number | string;
  plate_consumption: number | string;
  page_wastes: number | string;
  wastes?: number | string; // Legacy field
  remarks: string;
  record_date: string;
  created_at: string;
}

// API payload type
interface ProductionRecordPayload {
  id?: number;
  user_id: number;
  publication_id: number | null;
  custom_publication_name?: string;
  po_number: number;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  downtime_entries: Array<{
    downtime_reason_id: number;
    downtime_duration: string;
  }>;
  newsprint_id: number | null;
  newsprint_kgs: number;
  plate_consumption: number;
  page_wastes: number;
  wastes?: number; // Legacy field
  remarks: string;
  record_date: string;
}

type TabType = "form" | "reports";
type ModalType = "view" | "edit" | null;

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [downtimeReasons, setDowntimeReasons] = useState<DowntimeReason[]>([]);
  const [newsprintTypes, setNewsprintTypes] = useState<NewsprintType[]>([]);
  const [userRecords, setUserRecords] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Publication search states
  const [publicationSearch, setPublicationSearch] = useState("");
  const [filteredPublications, setFilteredPublications] = useState<
    Publication[]
  >([]);
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const publicationDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Publications filtered by user's location
  const [vkPublications, setVkPublications] = useState<Publication[]>([]);
  const [ospPublications, setOspPublications] = useState<Publication[]>([]);
  const [nammaPublications, setNammaPublications] = useState<Publication[]>([]);
  const [publicationType, setPublicationType] = useState<'VK' | 'OSP' | 'NAMMA' | ''>('');
  const [allPublications, setAllPublications] = useState<Publication[]>([]);

  const [formData, setFormData] = useState({
    publication_id: "",
    custom_publication_name: "",
    po_number: "",
    color_pages: 0,
    bw_pages: 0,
    total_pages: 0,
    machine_id: "",
    lprs_time: "00:00:00",
    page_start_time: "00:00:00",
    page_end_time: "00:00:00",
    downtime_entries: [
      {
        downtime_reason_id: "",
        downtime_duration: "00:00:00",
      },
    ],
    newsprint_id: "",
    newsprint_kgs: 0,
    plate_consumption: 0,
    wastes: 0,
    page_wastes: 0,
    remarks: "",
    record_date: new Date().toISOString().split("T")[0],
  });

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("form");

  // ✅ Load master data and filter by user location
  useEffect(() => {
    const loadMasterData = async (): Promise<void> => {
      try {
        console.log(`📍 Loading publications for location: ${user?.location}`);

        const [vkRes, ospRes, nammaRes, machRes, dtRes, npRes] = await Promise.all([
          masterAPI.getPublications('VK'),
          masterAPI.getPublications('OSP'),
          masterAPI.getPublications('NAMMA'),
          masterAPI.getMachines(),
          masterAPI.getDowntimeReasons(),
          masterAPI.getNewsprintTypes(),
        ]);

        const vkData = vkRes.data.data || vkRes.data || [];
        const ospData = ospRes.data.data || ospRes.data || [];
        const nammaData = nammaRes.data.data || nammaRes.data || [];
        const machinesData = machRes.data.data || machRes.data || [];
        const downtimeReasonsData = dtRes.data.data || dtRes.data || [];
        const newsprintTypesData = npRes.data.data || npRes.data || [];

        console.log('📊 Raw API Response - VK:', vkData.length);
        console.log('📊 Raw API Response - OSP:', ospData.length);
        console.log('📊 Raw API Response - NAMMA:', nammaData.length);
        console.log('📊 Sample VK publication:', vkData[0]);
        console.log('📊 Sample OSP publication:', ospData[0]);

        // ✅ Filter publications by user's location (case-insensitive)
        const filterByLocation = (pubs: Publication[]): Publication[] => {
          if (!Array.isArray(pubs)) return [];
          const filtered = pubs.filter(
            (pub) => pub.location?.toLowerCase() === user?.location?.toLowerCase()
          );
          console.log(`🔍 Filtered ${pubs.length} publications to ${filtered.length} for location: ${user?.location}`);
          return filtered;
        };

        const vkFiltered = filterByLocation(vkData);
        const ospFiltered = filterByLocation(ospData);
        const nammaFiltered = filterByLocation(nammaData);

        setVkPublications(vkFiltered);
        setOspPublications(ospFiltered);
        setNammaPublications(nammaFiltered);

        // ✅ Combine all publications for search
        const combined = [...vkFiltered, ...ospFiltered, ...nammaFiltered];
        setAllPublications(combined);

        setMachines(Array.isArray(machinesData) ? machinesData : []);
        setDowntimeReasons(Array.isArray(downtimeReasonsData) ? downtimeReasonsData : []);
        setNewsprintTypes(Array.isArray(newsprintTypesData) ? newsprintTypesData : []);

        console.log('✅ Publications filtered by location:', {
          location: user?.location,
          vk: vkFiltered.length,
          osp: ospFiltered.length,
          namma: nammaFiltered.length,
          total: combined.length,
        });

        if (combined.length === 0) {
          setErrorMessage(`⚠️ No publications available for your location: ${user?.location}`);
        } else {
          setErrorMessage(''); // Clear error if publications are found
        }
      } catch (error) {
        console.error('❌ Error loading master data:', error);
        setErrorMessage('Failed to load master data');
      } finally {
        setIsLoading(false);
      }
    };

    loadMasterData();
  }, [user?.location]);

  // Load user records
  useEffect(() => {
    const loadUserRecords = async (): Promise<void> => {
      if (!user) return;
      try {
        const response = await productionAPI.getRecordsByUser(user.id);
        const records = response.data?.data || response.data || [];
        setUserRecords(Array.isArray(records) ? records : []);
      } catch (error) {
        console.error("Error loading user records:", error);
        setErrorMessage("Failed to load production records");
      }
    };

    loadUserRecords();
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        publicationDropdownRef.current &&
        !publicationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPublicationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle publication type change - show filtered publications
  const handlePublicationTypeChange = (type: 'VK' | 'OSP' | 'NAMMA') => {
    setPublicationType(type);
    setPublicationSearch('');

    let pubs: Publication[] = [];
    if (type === 'VK') {
      pubs = vkPublications;
    } else if (type === 'OSP') {
      pubs = ospPublications;
    } else if (type === 'NAMMA') {
      pubs = nammaPublications;
    }

    setFilteredPublications(pubs);
    setFormData(prev => ({
      ...prev,
      publication_id: '',
      custom_publication_name: '',
    }));
  };

  // Handle publication search
  const handlePublicationSearch = (value: string): void => {
    setPublicationSearch(value);
    setShowPublicationDropdown(true);

    // Filter based on selected type
    let pubsToSearch: Publication[] = [];
    if (publicationType === 'VK') {
      pubsToSearch = vkPublications;
    } else if (publicationType === 'OSP') {
      pubsToSearch = ospPublications;
    } else if (publicationType === 'NAMMA') {
      pubsToSearch = nammaPublications;
    } else {
      pubsToSearch = allPublications;
    }

    if (value.trim().length > 0) {
      const filtered = pubsToSearch.filter((pub) =>
        pub.name.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredPublications(filtered);
    } else {
      setFilteredPublications(pubsToSearch);
    }
  };

  const handleDowntimeChange = (
    index: number,
    field: "downtime_reason_id" | "downtime_duration",
    value: string,
  ): void => {
    setFormData((prev) => {
      const newDowntimeEntries = [...prev.downtime_entries];
      newDowntimeEntries[index] = {
        ...newDowntimeEntries[index],
        [field]: value,
      };
      return {
        ...prev,
        downtime_entries: newDowntimeEntries,
      };
    });
  };

  const handleAddDowntime = (): void => {
    setFormData((prev) => ({
      ...prev,
      downtime_entries: [
        ...prev.downtime_entries,
        {
          downtime_reason_id: "",
          downtime_duration: "00:00:00",
        },
      ],
    }));
  };

  const handleRemoveDowntime = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      downtime_entries: prev.downtime_entries.filter((_, i) => i !== index),
    }));
  };

  const handlePublicationSelect = (pub: Publication): void => {
    setFormData((prev) => ({
      ...prev,
      publication_id: pub.id.toString(),
      custom_publication_name: "",
    }));
    setPublicationSearch(pub.name);
    setShowPublicationDropdown(false);
  };

  const handleOneTimePublication = (): void => {
    setFormData((prev) => ({
      ...prev,
      publication_id: "one-time",
      custom_publication_name: "",
    }));
    setPublicationSearch("");
    setShowPublicationDropdown(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ): void => {
    const { name, value } = e.target;

    if (name === "color_pages" || name === "bw_pages") {
      const colorPages =
        name === "color_pages"
          ? parseInt(value) || 0
          : (formData.color_pages as number);
      const bwPages =
        name === "bw_pages"
          ? parseInt(value) || 0
          : (formData.bw_pages as number);

      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
        total_pages: colorPages + bwPages,
      }));
    } else if (name === "plate_consumption" || name === "page_wastes" || name === "wastes") {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    try {
      if (!user) {
        setErrorMessage("User not authenticated");
        return;
      }

      if (!formData.publication_id) {
        setErrorMessage("Please select or enter a publication");
        return;
      }

      if (
        formData.publication_id === "one-time" &&
        !formData.custom_publication_name.trim()
      ) {
        setErrorMessage("Please enter a publication name");
        return;
      }

      if (!formData.machine_id) {
        setErrorMessage("Please select a machine");
        return;
      }

      if (formData.remarks.length > 100) {
        setErrorMessage("Remarks must be 100 characters or less");
        return;
      }

      const payload = {
        user_id: user.id,
        publication_id:
          formData.publication_id === "one-time"
            ? null
            : parseInt(formData.publication_id),
        custom_publication_name:
          formData.publication_id === "one-time"
            ? formData.custom_publication_name
            : undefined,
        po_number: parseInt(formData.po_number) || 0,
        color_pages: formData.color_pages,
        bw_pages: formData.bw_pages,
        total_pages: formData.total_pages,
        machine_id: parseInt(formData.machine_id),
        lprs_time: formData.lprs_time,
        page_start_time: formData.page_start_time,
        page_end_time: formData.page_end_time,
        downtime_entries: formData.downtime_entries
          .filter((entry) => entry.downtime_reason_id !== "")
          .map((entry) => ({
            downtime_reason_id: parseInt(String(entry.downtime_reason_id)),
            downtime_duration: entry.downtime_duration,
          })),
        newsprint_id: formData.newsprint_id
          ? parseInt(formData.newsprint_id)
          : null,
        newsprint_kgs: parseFloat(formData.newsprint_kgs.toString()) || 0,
        plate_consumption: parseInt(formData.plate_consumption.toString()) || 0,
        page_wastes: parseInt(formData.page_wastes.toString()) || 0,
        wastes: parseInt(formData.wastes.toString()) || 0,
        remarks: formData.remarks,
        record_date: formData.record_date,
      };

      await productionAPI.createRecord(payload);
      setSuccessMessage("Production record submitted successfully!");

      // Reset form and reload records
      setFormData({
        publication_id: "",
        custom_publication_name: "",
        po_number: "",
        color_pages: 0,
        bw_pages: 0,
        total_pages: 0,
        machine_id: "",
        lprs_time: "00:00:00",
        page_start_time: "00:00:00",
        page_end_time: "00:00:00",
        downtime_entries: [
          {
            downtime_reason_id: "",
            downtime_duration: "00:00:00",
          },
        ],
        newsprint_id: "",
        newsprint_kgs: 0,
        plate_consumption: 0,
        wastes: 0,
        page_wastes: 0,
        remarks: "",
        record_date: new Date().toISOString().split("T")[0],
      });
      setPublicationType('');
      setPublicationSearch("");

      // Reload user records
      if (user) {
        const response = await productionAPI.getRecordsByUser(user.id);
        const records = response.data?.data || response.data || [];
        setUserRecords(Array.isArray(records) ? records : []);
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      setErrorMessage(error.response?.data?.error || "Failed to submit record");
    }
  };

  // View modal handler
  const handleViewRecord = (record: ProductionRecord): void => {
    setSelectedRecord(record);
    setModalType("view");
  };

  // Edit modal handler
  const handleEditRecord = (record: ProductionRecord): void => {
    setSelectedRecord(record);
    setEditFormData({ ...record });
    setModalType("edit");
  };

  // Delete handler
  const handleDeleteRecord = async (recordId: number): Promise<void> => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await productionAPI.deleteRecord(recordId);
        setSuccessMessage("Record deleted successfully!");

        if (user) {
          const response = await productionAPI.getRecordsByUser(user.id);
          const records = response.data?.data || response.data || [];
          setUserRecords(Array.isArray(records) ? records : []);
        }
      } catch (error: any) {
        setErrorMessage(
          error.response?.data?.error || "Failed to delete record",
        );
      }
    }
  };

  // Close modal
  const closeModal = (): void => {
    setModalType(null);
    setSelectedRecord(null);
    setEditFormData(null);
  };

  // Handle edit form change - with proper null guard
  const handleEditFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ): void => {
    const { name, value } = e.target;

    if (!editFormData) return;

    setEditFormData((prev: EditFormData | null) => {
      if (!prev) return null;

      if (name === "color_pages" || name === "bw_pages") {
        const colorPages =
          name === "color_pages" ? parseInt(value) || 0 : prev.color_pages;
        const bwPages =
          name === "bw_pages" ? parseInt(value) || 0 : prev.bw_pages;

        return {
          ...prev,
          [name]: parseInt(value) || 0,
          total_pages: colorPages + bwPages,
        };
      }

      if (
        name === "po_number" ||
        name === "machine_id" ||
        name === "newsprint_id" ||
        name === "plate_consumption" ||
        name === "page_wastes" ||
        name === "wastes"
      ) {
        return {
          ...prev,
          [name]: value,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  // Handle edit downtime change - with proper null guard
  const handleEditDowntimeChange = (
    index: number,
    field: string,
    value: string,
  ): void => {
    setEditFormData((prev: EditFormData | null) => {
      if (!prev || !prev.downtime_entries) return null;

      const newDowntimeEntries = [...prev.downtime_entries];
      if (index < 0 || index >= newDowntimeEntries.length) return prev;

      newDowntimeEntries[index] = {
        ...newDowntimeEntries[index],
        [field]: value,
      };

      return {
        ...prev,
        downtime_entries: newDowntimeEntries,
      };
    });
  };

  // Handle edit submit - with proper null guard and type conversion
  const handleEditSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (!editFormData) {
      setErrorMessage("No record data to update");
      return;
    }

    try {
      // Convert form data to proper API payload type
      const payload: ProductionRecordPayload = {
        id: editFormData.id,
        user_id: editFormData.user_id,
        publication_id: editFormData.publication_id,
        custom_publication_name:
          editFormData.custom_publication_name === null
            ? undefined
            : editFormData.custom_publication_name,
        po_number: parseInt(String(editFormData.po_number)) || 0,
        color_pages: editFormData.color_pages,
        bw_pages: editFormData.bw_pages,
        total_pages: editFormData.total_pages,
        machine_id: parseInt(String(editFormData.machine_id)) || 0,
        lprs_time: editFormData.lprs_time,
        page_start_time: editFormData.page_start_time,
        page_end_time: editFormData.page_end_time,
        downtime_entries: (editFormData.downtime_entries || [])
          .filter(
            (entry: any) =>
              entry.downtime_reason_id !== "" && entry.downtime_reason_id !== 0,
          )
          .map((entry: any) => ({
            downtime_reason_id: parseInt(String(entry.downtime_reason_id)) || 0,
            downtime_duration: entry.downtime_duration,
          })),
        newsprint_id: editFormData.newsprint_id
          ? parseInt(String(editFormData.newsprint_id))
          : null,
        newsprint_kgs: parseFloat(String(editFormData.newsprint_kgs)) || 0,
        plate_consumption:
          parseInt(String(editFormData.plate_consumption)) || 0,
        page_wastes: parseInt(String(editFormData.page_wastes)) || 0,
        wastes: editFormData.wastes ? parseInt(String(editFormData.wastes)) || 0 : undefined,
        remarks: editFormData.remarks || "",
        record_date: editFormData.record_date,
      };

      await productionAPI.updateRecord(editFormData.id, payload);
      setSuccessMessage("Record updated successfully!");
      closeModal();

      // Reload user records
      if (user) {
        const response = await productionAPI.getRecordsByUser(user.id);
        const records = response.data?.data || response.data || [];
        setUserRecords(Array.isArray(records) ? records : []);
      }
    } catch (error: any) {
      console.error("Error updating record:", error);
      setErrorMessage(error.response?.data?.error || "Failed to update record");
    }
  };
  const getPublicationName = (
    pubId: number | null,
    customName: string | null,
  ): string => {
    if (customName) return customName;
    if (pubId) {
      const pub = allPublications.find((p) => p.id === pubId);
      return pub?.name || "Unknown";
    }
    return "N/A";
  };

  const getMachineName = (machineId: number): string => {
    const machine = machines.find((m) => m.id === machineId);
    return machine?.name || "Unknown";
  };

  const getNewsprintName = (newsprintId: number | null): string => {
    if (!newsprintId) return "N/A";
    const newsprint = newsprintTypes.find((n) => n.id === newsprintId);
    return newsprint?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div>
        <UserNavbar />
        <div className="loading">⏳ Loading publications for your location...</div>
      </div>
    );
  }

  return (
    <div>
      <UserNavbar />
      <div className="user-dashboard">
        <div className="dashboard-header">
          <h2>Welcome, {user?.name}</h2>
          <p>📍 Location: {user?.location}</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === "form" ? "active" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            Production Form
          </button>
          <button
            className={`tab-button ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports ({userRecords.length})
          </button>
        </div>

        {/* Form Tab */}
        {activeTab === "form" && (
          <div className="form-container">
            <h3>Daily Production Record</h3>

            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            <form onSubmit={handleSubmit} className="production-form">
              {/* ✅ Publication Type Selector */}
              <div className="form-section">
                <h4>Select Publication Type 📰</h4>
                <div className="publication-type-selector">
                  <button
                    type="button"
                    className={`type-btn ${publicationType === 'VK' ? 'active' : ''}`}
                    onClick={() => handlePublicationTypeChange('VK')}
                    disabled={vkPublications.length === 0}
                    title={vkPublications.length === 0 ? "No VK publications for your location" : ""}
                  >
                    📰 VK ({vkPublications.length})
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${publicationType === 'OSP' ? 'active' : ''}`}
                    onClick={() => handlePublicationTypeChange('OSP')}
                    disabled={ospPublications.length === 0}
                    title={ospPublications.length === 0 ? "No OSP publications for your location" : ""}
                  >
                    📰 OSP ({ospPublications.length})
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${publicationType === 'NAMMA' ? 'active' : ''}`}
                    onClick={() => handlePublicationTypeChange('NAMMA')}
                    disabled={nammaPublications.length === 0}
                    title={nammaPublications.length === 0 ? "No NAMMA publications for your location" : ""}
                  >
                    📰 NAMMA ({nammaPublications.length})
                  </button>
                </div>
              </div>

              {/* Publication & PO Details */}
              <div className="form-section">
                <h4>Publication & PO Details</h4>
                
                {publicationType && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="publication">
                        {publicationType} Publication *
                      </label>
                      <div
                        className="publication-search-wrapper"
                        ref={publicationDropdownRef}
                      >
                        <input
                          type="text"
                          id="publication"
                          placeholder={`Search ${publicationType} publications...`}
                          value={publicationSearch}
                          onChange={(e) =>
                            handlePublicationSearch(e.target.value)
                          }
                          onFocus={() => {
                            setShowPublicationDropdown(true);
                            if (publicationSearch.trim().length === 0) {
                              if (publicationType === 'VK') {
                                setFilteredPublications(vkPublications);
                              } else if (publicationType === 'OSP') {
                                setFilteredPublications(ospPublications);
                              } else if (publicationType === 'NAMMA') {
                                setFilteredPublications(nammaPublications);
                              }
                            }
                          }}
                          className="publication-search-input"
                        />
                        {showPublicationDropdown && (
                          <div className="publication-dropdown">
                            {filteredPublications.length > 0 ? (
                              <>
                                {filteredPublications.map((pub) => (
                                  <div
                                    key={pub.id}
                                    className="publication-option"
                                    onClick={() => handlePublicationSelect(pub)}
                                  >
                                    <span className="pub-name">{pub.name}</span>
                                    <span className="pub-code">{pub.code}</span>
                                  </div>
                                ))}
                                <div className="publication-divider"></div>
                                <div
                                  className="publication-option other-option"
                                  onClick={handleOneTimePublication}
                                >
                                  <span>+ One Time (Enter Publication Name)</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="publication-option disabled">
                                  No publications found for {user?.location}
                                </div>
                                <div className="publication-divider"></div>
                                <div
                                  className="publication-option other-option"
                                  onClick={handleOneTimePublication}
                                >
                                  <span>+ One Time (Enter Publication Name)</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {formData.publication_id === "one-time" && (
                        <div className="form-group" style={{ marginTop: "10px" }}>
                          <label htmlFor="custom_publication">
                            Enter Publication Name *
                          </label>
                          <input
                            id="custom_publication"
                            type="text"
                            name="custom_publication_name"
                            value={formData.custom_publication_name}
                            onChange={handleInputChange}
                            placeholder="Enter publication name"
                            required
                          />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="po_number">PO Number *</label>
                      <input
                        id="po_number"
                        type="number"
                        name="po_number"
                        value={formData.po_number}
                        onChange={handleInputChange}
                        placeholder="Enter PO number"
                        required
                      />
                    </div>
                  </div>
                )}

                {!publicationType && (
                  <div className="form-message">
                    <p>👆 Please select a publication type above to continue</p>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h4>Pages</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="color_pages">Color Pages</label>
                    <input
                      id="color_pages"
                      type="number"
                      name="color_pages"
                      value={formData.color_pages}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bw_pages">Black & White Pages</label>
                    <input
                      id="bw_pages"
                      type="number"
                      name="bw_pages"
                      value={formData.bw_pages}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="total_pages">Total Pages</label>
                    <input
                      id="total_pages"
                      type="number"
                      name="total_pages"
                      value={formData.total_pages}
                      readOnly
                      className="total-pages-display"
                    />
                    <small style={{ color: "#666" }}>Auto-calculated</small>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Machine & Timing</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="machine">Machine *</label>
                    <select
                      id="machine"
                      name="machine_id"
                      value={formData.machine_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Machine</option>
                      {machines.map((mach) => (
                        <option key={mach.id} value={mach.id}>
                          {mach.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="lprs_time">LPRS Time (HH:MM:SS)</label>
                    <input
                      id="lprs_time"
                      type="time"
                      name="lprs_time"
                      value={formData.lprs_time}
                      onChange={handleInputChange}
                      step="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="page_start_time">
                      Print Start Time (HH:MM:SS)
                    </label>
                    <input
                      id="page_start_time"
                      type="time"
                      name="page_start_time"
                      value={formData.page_start_time}
                      onChange={handleInputChange}
                      step="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="page_end_time">
                      Print End Time (HH:MM:SS)
                    </label>
                    <input
                      id="page_end_time"
                      type="time"
                      name="page_end_time"
                      value={formData.page_end_time}
                      onChange={handleInputChange}
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h4>Downtime Details</h4>
                  <button
                    type="button"
                    className="btn-add-downtime"
                    onClick={handleAddDowntime}
                    title="Add another downtime entry"
                  >
                    + Add Downtime
                  </button>
                </div>

                {formData.downtime_entries.map((entry, index) => (
                  <div key={index} className="downtime-entry">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`downtime_reason_${index}`}>
                          Downtime Reason
                        </label>
                        <select
                          id={`downtime_reason_${index}`}
                          value={entry.downtime_reason_id}
                          onChange={(e) =>
                            handleDowntimeChange(
                              index,
                              "downtime_reason_id",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Select Reason</option>
                          {downtimeReasons.map((reason) => (
                            <option key={reason.id} value={reason.id}>
                              {reason.reason || reason.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`downtime_duration_${index}`}>
                          Duration (HH:MM:SS)
                        </label>
                        <input
                          id={`downtime_duration_${index}`}
                          type="text"
                          placeholder="00:00:00"
                          value={entry.downtime_duration}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9:]*$/.test(val) && val.length <= 8) {
                              handleDowntimeChange(
                                index,
                                "downtime_duration",
                                val,
                              );
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const formatted = formatDuration(val);
                            handleDowntimeChange(
                              index,
                              "downtime_duration",
                              formatted,
                            );
                          }}
                          maxLength={8}
                        />
                        <small style={{ color: "#666" }}>
                          Enter as HH:MM:SS
                        </small>
                      </div>

                      {formData.downtime_entries.length > 1 && (
                        <div className="form-group btn-group">
                          <button
                            type="button"
                            className="btn-remove-downtime"
                            onClick={() => handleRemoveDowntime(index)}
                            title="Remove this downtime entry"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-section">
                <h4>Newsprint & Consumption</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="newsprint">Newsprint Type</label>
                    <select
                      id="newsprint"
                      name="newsprint_id"
                      value={formData.newsprint_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Newsprint</option>
                      {newsprintTypes.map((np) => (
                        <option key={np.id} value={np.id}>
                          {np.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="newsprint_kgs">Enter KGs (Decimal)</label>
                    <input
                      id="newsprint_kgs"
                      type="number"
                      name="newsprint_kgs"
                      value={formData.newsprint_kgs}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="Enter KGs (e.g., 10.50)"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="page_wastes">Pages/Copies Wasted</label>
                    <input
                      id="page_wastes"
                      type="number"
                      name="page_wastes"
                      value={formData.page_wastes}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="plate_consumption">Total Plate Consumption</label>
                    <input
                      id="plate_consumption"
                      type="number"
                      name="plate_consumption"
                      value={formData.plate_consumption}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="wastes">Total Plates Wasted</label>
                    <input
                      id="wastes"
                      type="number"
                      name="wastes"
                      value={formData.wastes}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  
                </div>
              </div>

              <div className="form-section">
                <h4>Additional Info</h4>
                <div className="form-group">
                  <label htmlFor="remarks">Remarks (Max 100 characters)</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Enter any remarks"
                    maxLength={100}
                    rows={3}
                  />
                  <small>{formData.remarks.length}/100</small>
                </div>

                <div className="form-group">
                  <label htmlFor="record_date">Record Date</label>
                  <input
                    id="record_date"
                    type="date"
                    name="record_date"
                    value={formData.record_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Submit Record
                </button>
                <button type="reset" className="btn-reset">
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="reports-container">
            <h3>My Production Records</h3>

            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            {userRecords.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Publication</th>
                      <th>PO #</th>
                      <th>Machine</th>
                      <th>Color Pg</th>
                      <th>BW Pg</th>
                      <th>Total Pg</th>
                      <th>LPRS Time</th>
                      <th>Newsprint</th>
                      <th>KGs</th>
                      <th>Plate</th>
                      <th>Pages Wasted</th>
                      <th>Plates Wasted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          {new Date(record.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {getPublicationName(
                            record.publication_id,
                            record.custom_publication_name,
                          )}
                        </td>
                        <td>{record.po_number}</td>
                        <td>{getMachineName(record.machine_id)}</td>
                        <td>{record.color_pages}</td>
                        <td>{record.bw_pages}</td>
                        <td>
                          <strong>{record.total_pages}</strong>
                        </td>
                        <td>{record.lprs_time}</td>
                        <td>{getNewsprintName(record.newsprint_id)}</td>
                        <td>
                          {parseFloat(
                            record.newsprint_kgs?.toString() || "0",
                          ).toFixed(2)}
                        </td>
                        <td>{record.plate_consumption}</td>
                        <td>{record.page_wastes}</td>
                        <td>{record.wastes}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-view"
                            onClick={() => handleViewRecord(record)}
                            title="View details"
                          >
                            View
                          </button>
                          <button
                            className="btn-edit"
                            onClick={() => handleEditRecord(record)}
                            title="Edit record"
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Delete record"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-records">
                <p>No production records submitted yet.</p>
                <button
                  className="btn-go-to-form"
                  onClick={() => setActiveTab("form")}
                >
                  Go to Form →
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Modal */}
        {modalType === "view" && selectedRecord && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Record Details</h3>
                <button className="modal-close" onClick={closeModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Publication & PO Section */}
                <div className="detail-row">
                  <span className="label">Publication:</span>
                  <span className="value">
                    {getPublicationName(
                      selectedRecord.publication_id,
                      selectedRecord.custom_publication_name,
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">PO Number:</span>
                  <span className="value">{selectedRecord.po_number}</span>
                </div>

                {/* Pages Section */}
                <div className="detail-row">
                  <span className="label">Pages:</span>
                  <span className="value">
                    Color: {selectedRecord.color_pages} | BW:{" "}
                    {selectedRecord.bw_pages} | Total:{" "}
                    {selectedRecord.total_pages}
                  </span>
                </div>

                {/* Machine & Timing Section */}
                <div className="detail-section">
                  <h4>Machine & Timing Background</h4>
                  <div className="detail-row">
                    <span className="label">Machine:</span>
                    <span className="value">
                      {getMachineName(selectedRecord.machine_id)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">LPRS Time:</span>
                    <span className="value">{selectedRecord.lprs_time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Print Start Time:</span>
                    <span className="value">
                      {selectedRecord.page_start_time}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Print End Time:</span>
                    <span className="value">
                      {selectedRecord.page_end_time}
                    </span>
                  </div>
                </div>

                {/* Newsprint & Consumption Section */}
                <div className="detail-section">
                  <h4>Newsprint & Consumption</h4>
                  <div className="detail-row">
                    <span className="label">Newsprint Type:</span>
                    <span className="value">
                      {getNewsprintName(selectedRecord.newsprint_id)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">KGs Consumed:</span>
                    <span className="value">
                      {parseFloat(
                        selectedRecord.newsprint_kgs?.toString() || "0",
                      ).toFixed(2)}{" "}
                      kg
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Plate Consumption:</span>
                    <span className="value">
                      {selectedRecord.plate_consumption}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Pages Wasted:</span>
                    <span className="value">
                      {selectedRecord.page_wastes}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Plates Wasted:</span>
                    <span className="value">
                      {selectedRecord.wastes}
                    </span>
                  </div>
                </div>

                {/* Downtime Details */}
                {selectedRecord.downtime_entries &&
                  selectedRecord.downtime_entries.length > 0 && (
                    <div className="detail-section">
                      <h4>Downtime Details</h4>
                      <div className="downtime-list">
                        {selectedRecord.downtime_entries.map((dt, idx) => {
                          const reason = downtimeReasons.find(
                            (r) => r.id === dt.downtime_reason_id,
                          );
                          return (
                            <div key={idx} className="downtime-item-detailed">
                              <span className="reason">
                                {reason?.reason || reason?.name || "Unknown"}
                              </span>
                              <span className="duration">
                                {dt.downtime_duration}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Remarks */}
                {selectedRecord.remarks && (
                  <div className="detail-section">
                    <h4>Remarks</h4>
                    <p className="remarks-text">{selectedRecord.remarks}</p>
                  </div>
                )}

                {/* Record Metadata */}
                <div className="detail-section">
                  <h4>Record Information</h4>

                  <div className="detail-row">
                    <span className="label">Submitted On:</span>
                    <span className="value">
                      {new Date(selectedRecord.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {modalType === "edit" && editFormData && (
          <div className="modal-overlay" onClick={closeModal}>
            <div
              className="modal-content modal-edit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Edit Record</h3>
                <button className="modal-close" onClick={closeModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleEditSubmit} className="edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Publication</label>
                      <input
                        type="text"
                        value={getPublicationName(
                          editFormData.publication_id,
                          editFormData.custom_publication_name as string | null,
                        )}
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label>PO Number</label>
                      <input
                        type="number"
                        name="po_number"
                        value={editFormData.po_number || ""}
                        onChange={handleEditFormChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Color Pages</label>
                      <input
                        type="number"
                        name="color_pages"
                        value={editFormData.color_pages || 0}
                        onChange={handleEditFormChange}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>BW Pages</label>
                      <input
                        type="number"
                        name="bw_pages"
                        value={editFormData.bw_pages || 0}
                        onChange={handleEditFormChange}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Total Pages</label>
                      <input
                        type="number"
                        value={editFormData.total_pages || 0}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>LPRS Time</label>
                      <input
                        type="time"
                        name="lprs_time"
                        value={editFormData.lprs_time || "00:00:00"}
                        onChange={handleEditFormChange}
                        step="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Print Start Time</label>
                      <input
                        type="time"
                        name="page_start_time"
                        value={editFormData.page_start_time || "00:00:00"}
                        onChange={handleEditFormChange}
                        step="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Print End Time</label>
                      <input
                        type="time"
                        name="page_end_time"
                        value={editFormData.page_end_time || "00:00:00"}
                        onChange={handleEditFormChange}
                        step="1"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Newsprint Type</label>
                      <select
                        name="newsprint_id"
                        value={editFormData.newsprint_id || ""}
                        onChange={handleEditFormChange}
                      >
                        <option value="">Select Newsprint</option>
                        {newsprintTypes.map((np) => (
                          <option key={np.id} value={np.id}>
                            {np.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>KGs</label>
                      <input
                        type="number"
                        name="newsprint_kgs"
                        value={editFormData.newsprint_kgs || 0}
                        onChange={handleEditFormChange}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Plate Consumption</label>
                      <input
                        type="number"
                        name="plate_consumption"
                        value={editFormData.plate_consumption || 0}
                        onChange={handleEditFormChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Pages Wasted</label>
                      <input
                        type="number"
                        name="page_wastes"
                        value={editFormData.page_wastes || 0}
                        onChange={handleEditFormChange}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Plates Wasted</label>
                      <input
                        type="number"
                        name="wastes"
                        value={editFormData.wastes || 0}
                        onChange={handleEditFormChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-section-edit">
                    <h4>Downtime Entries</h4>
                    {editFormData.downtime_entries &&
                    Array.isArray(editFormData.downtime_entries) &&
                    editFormData.downtime_entries.length > 0 ? (
                      editFormData.downtime_entries.map(
                        (entry: any, index: number) => (
                          <div key={index} className="downtime-edit-row">
                            <select
                              value={entry?.downtime_reason_id || ""}
                              onChange={(e) =>
                                handleEditDowntimeChange(
                                  index,
                                  "downtime_reason_id",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select Reason</option>
                              {downtimeReasons.map((reason) => (
                                <option key={reason.id} value={reason.id}>
                                  {reason.reason || reason.name || "Unknown"}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="HH:MM:SS"
                              value={entry?.downtime_duration || "00:00:00"}
                              onChange={(e) =>
                                handleEditDowntimeChange(
                                  index,
                                  "downtime_duration",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        ),
                      )
                    ) : (
                      <p className="no-downtime">No downtime entries</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={editFormData.remarks || ""}
                      onChange={handleEditFormChange}
                      maxLength={100}
                      rows={3}
                    />
                    <small>{(editFormData.remarks || "").length}/100</small>
                  </div>

                  <div className="form-group">
                    <label>Record Date</label>
                    <input
                      type="date"
                      name="record_date"
                      value={editFormData.record_date || ""}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-submit">
                      Update Record
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format duration to HH:MM:SS
const formatDuration = (value: string): string => {
  let cleaned = value.replace(/[^\d:]/g, "");
  const parts = cleaned.split(":");

  let hours = parts[0] ? parseInt(parts[0]) || 0 : 0;
  let minutes = parts[1] ? parseInt(parts[1]) || 0 : 0;
  let seconds = parts[2] ? parseInt(parts[2]) || 0 : 0;

  hours = Math.min(Math.max(0, hours), 23);
  minutes = Math.min(Math.max(0, minutes), 59);
  seconds = Math.min(Math.max(0, seconds), 59);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default UserDashboard;

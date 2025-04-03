import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InspectionType = 'API510' | 'API570' | 'API653';

const coatingConditions = ['excellent', 'good', 'fair', 'poor', 'not painted'] as const;
type CoatingCondition = typeof coatingConditions[number];

const insulationConditions = ['excellent', 'good', 'fair', 'poor', 'not insulated'] as const;
type InsulationCondition = typeof insulationConditions[number];

const equipmentTypes = ['boiler', 'drum', 'exchanger', 'reactor', 'tower'] as const;
type EquipmentType = typeof equipmentTypes[number];

interface BaseFormData {
  inspectionType: InspectionType;
  inspectionDate: string;
  inspector: string;
  facility: string;
  // findings: string; // Removed
  coating: CoatingCondition;
  insulation: InsulationCondition;
  welds: string;
  recommendations: string;
}

interface API510FormData extends BaseFormData {
  equipmentId: string;
  equipmentType: EquipmentType;
  shell: string;
  heads: string;
  nozzles: string;
  supports: string;
}

interface API570FormData extends BaseFormData {
  pipingId: string;
  pipingDetails: string; // Added
  pipingComponents: string;
  supports: string;
  bolting: string;
}

interface API653FormData extends BaseFormData {
  tankNumber: string;
  tankType: string;
  tankLocation: string;
  shell: string;
  bottom: string;
  roof: string;
  nozzles: string;
}

type FormData = API510FormData | API570FormData | API653FormData;

const initialFormData: FormData = {
  inspectionType: 'API510',
  inspectionDate: '',
  inspector: '',
  facility: '',
  // findings: '', // Removed
  coating: 'good',
  insulation: 'good',
  welds: '',
  recommendations: '',
  // API510 specific fields
  equipmentId: '',
  equipmentType: 'boiler',
  shell: '',
  heads: '',
  nozzles: '',
  supports: '',
  // API570 specific fields
  pipingId: '',
  pipingDetails: '', // Added
  pipingComponents: '',
  bolting: '',
  // API653 specific fields
  tankNumber: '',
  tankType: '',
  tankLocation: '',
  bottom: '',
  roof: '',
};

export function InspectionForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      // Generate report using Gemini AI - Use ONLY import.meta.env for Vite frontend
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData), // Send full form data to function
        }
      );

      const data = await response.json();

      if (!response.ok) {
          // Handle HTTP errors (like 4xx, 5xx) from the function itself
          const errorMsg = data.error || `Report generation failed with status: ${response.status}`;
          throw new Error(errorMsg);
      }
      if (data.error) {
        // Handle errors reported in the JSON body even with a 2xx status
        throw new Error(`Report generation failed: ${data.error}`);
      }
      if (!data.report) {
          throw new Error('Report generation succeeded but no report content was returned.');
      }

      // --- Start: Payload Filtering Logic ---

      // 1. Define base payload with common fields
      const basePayload: Partial<BaseFormData & { generated_report: string }> = {
        inspectionType: formData.inspectionType,
        inspectionDate: formData.inspectionDate,
        inspector: formData.inspector,
        facility: formData.facility,
        coating: formData.coating,
        insulation: formData.insulation,
        welds: formData.welds, // Include welds as it's now part of specific types
        recommendations: formData.recommendations,
        generated_report: data.report, // Add the generated report content
      };

      // 2. Add type-specific fields
      let payload: any; // Use 'any' for simplicity, or define specific DB payload types
      switch (formData.inspectionType) {
        case 'API510':
          payload = {
            ...basePayload,
            equipmentId: (formData as API510FormData).equipmentId,
            equipmentType: (formData as API510FormData).equipmentType,
            shell: (formData as API510FormData).shell,
            heads: (formData as API510FormData).heads,
            nozzles: (formData as API510FormData).nozzles,
            supports: (formData as API510FormData).supports,
          };
          break;
        case 'API570':
          payload = {
            ...basePayload,
            pipingId: (formData as API570FormData).pipingId,
            pipingDetails: (formData as API570FormData).pipingDetails, // Ensure 'piping_details' column exists in DB!
            pipingComponents: (formData as API570FormData).pipingComponents,
            supports: (formData as API570FormData).supports,
            bolting: (formData as API570FormData).bolting,
          };
          break;
        case 'API653':
          payload = {
            ...basePayload,
            tankNumber: (formData as API653FormData).tankNumber,
            tankType: (formData as API653FormData).tankType,
            tankLocation: (formData as API653FormData).tankLocation,
            shell: (formData as API653FormData).shell,
            bottom: (formData as API653FormData).bottom,
            roof: (formData as API653FormData).roof,
            nozzles: (formData as API653FormData).nozzles,
          };
          break;
        default:
          console.error("Unhandled inspection type:", formData.inspectionType);
          throw new Error(`Invalid inspection type encountered: ${formData.inspectionType}`);
      }

      // 3. Insert the filtered payload
      console.log("Inserting payload:", JSON.stringify(payload, null, 2)); // Log payload before insert
      const { data: reportData, error: dbError } = await supabase
        .from('reports')
        .insert([payload]) // <-- Use the filtered payload here
        .select()
        .single();

      // --- End: Payload Filtering Logic ---

      // Improved DB Error Handling
      if (dbError) {
          console.error("Supabase DB Insert Error Details:");
          console.error("Message:", dbError.message);
          console.error("Details:", dbError.details); // Often contains specific constraint violations
          console.error("Hint:", dbError.hint);     // Sometimes provides clues
          console.error("Full Error Object:", dbError); // Log the whole object

          // Update the error thrown/set for the user
          // Combine message and details for a more informative error
          const userErrorMessage = `DB Error: ${dbError.message}${dbError.details ? ` (${dbError.details})` : ''}`;
          throw new Error(userErrorMessage);
       }

      // Only set the report state if saving to DB was successful
      console.log("Report saved successfully. DB response:", reportData);
      setReport(data.report);

    } catch (err) {
      console.error("Error in handleSubmit:", err); // Log the full error
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during report generation or saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' }); // Specify charset
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `inspection-report-${formData.inspectionType}-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
  };

  // API 510 specific fields (excluding common ones moved out)
  const renderAPI510Fields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Shell
        </label>
        <textarea
          name="shell"
          value={(formData as API510FormData).shell}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Heads
        </label>
        <textarea
          name="heads"
          value={(formData as API510FormData).heads}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nozzles
        </label>
        <textarea
          name="nozzles"
          value={(formData as API510FormData).nozzles}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
       {/* Welds moved here for API 510 */}
       <div>
        <label className="block text-sm font-medium text-gray-700">
          Welds
        </label>
        <textarea
          name="welds"
          value={formData.welds} // Common field, access directly
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Supports
        </label>
        <textarea
          name="supports"
          value={(formData as API510FormData).supports}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
    </div>
  );

  // API 570 specific fields (excluding common ones moved out)
  const renderAPI570Fields = () => (
    <div className="space-y-4">
       {/* Piping Details Added Here */}
       <div>
        <label className="block text-sm font-medium text-gray-700">
          Piping
        </label>
        <textarea
          name="pipingDetails"
          value={(formData as API570FormData).pipingDetails}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Piping Components
        </label>
        <textarea
          name="pipingComponents"
          value={(formData as API570FormData).pipingComponents}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Supports
        </label>
        <textarea
          name="supports"
          value={(formData as API570FormData).supports}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bolting
        </label>
        <textarea
          name="bolting"
          value={(formData as API570FormData).bolting}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      {/* Welds moved here for API 570 */}
       <div>
        <label className="block text-sm font-medium text-gray-700">
          Welds
        </label>
        <textarea
          name="welds"
          value={formData.welds} // Common field, access directly
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
    </div>
  );

  // API 653 specific fields (excluding common ones moved out)
  const renderAPI653Fields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tank Number
          </label>
          <input
            type="text"
            name="tankNumber"
            value={(formData as API653FormData).tankNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tank Type
          </label>
          <input
            type="text"
            name="tankType"
            value={(formData as API653FormData).tankType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tank Location
          </label>
          <input
            type="text"
            name="tankLocation"
            value={(formData as API653FormData).tankLocation}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Shell
        </label>
        <textarea
          name="shell"
          value={(formData as API653FormData).shell}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bottom
        </label>
        <textarea
          name="bottom"
          value={(formData as API653FormData).bottom}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Roof
        </label>
        <textarea
          name="roof"
          value={(formData as API653FormData).roof}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nozzles
        </label>
        <textarea
          name="nozzles"
          value={(formData as API653FormData).nozzles}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
        {/* Welds for API 653 (assuming it should also be here, was common before) */}
        <div>
            <label className="block text-sm font-medium text-gray-700">
            Welds
            </label>
            <textarea
            name="welds"
            value={formData.welds} // Common field, access directly
            onChange={handleChange}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
            />
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Inspection Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Inspection Type
          </label>
          <select
            name="inspectionType"
            value={formData.inspectionType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="API510">API 510 - Pressure Vessel</option>
            <option value="API570">API 570 - Piping</option>
            <option value="API653">API 653 - Storage Tank</option>
          </select>
        </div>

        {/* Common Fields: Date, Inspector, Facility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Inspection Date
            </label>
            <input
              type="date"
              name="inspectionDate"
              value={formData.inspectionDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Inspector
            </label>
            <input
              type="text"
              name="inspector"
              value={formData.inspector}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Facility
            </label>
            <input
              type="text"
              name="facility"
              value={formData.facility}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>

         {/* Conditional API 510 IDs */}
         {formData.inspectionType === 'API510' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipment ID
              </label>
              <input
                type="text"
                name="equipmentId"
                value={(formData as API510FormData).equipmentId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipment Type
              </label>
              <select
                name="equipmentType"
                value={(formData as API510FormData).equipmentType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              >
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Conditional API 570 ID */}
        {formData.inspectionType === 'API570' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Piping ID
            </label>
            <input
              type="text"
              name="pipingId"
              value={(formData as API570FormData).pipingId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
        )}

        {/* Common Dropdowns: Coating, Insulation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
            <label className="block text-sm font-medium text-gray-700">
                Coating Condition
            </label>
            <select
                name="coating"
                value={formData.coating}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
            >
                {coatingConditions.map((condition) => (
                <option key={condition} value={condition}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                </option>
                ))}
            </select>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700">
                Insulation Condition
            </label>
            <select
                name="insulation"
                value={formData.insulation}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
            >
                {insulationConditions.map((condition) => (
                <option key={condition} value={condition}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                </option>
                ))}
            </select>
            </div>
        </div>

        {/* Render API-specific fields */}
        {formData.inspectionType === 'API510' && renderAPI510Fields()}
        {formData.inspectionType === 'API570' && renderAPI570Fields()}
        {formData.inspectionType === 'API653' && renderAPI653Fields()}

        {/* Findings Textarea Removed */}
        {/* <div> ... findings ... </div> */}

        {/* Recommendations */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Recommendations
          </label>
          <textarea
            name="recommendations"
            value={formData.recommendations}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-3 px-4 rounded-md text-white font-medium",
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Generating & Saving Report...
            </span>
          ) : (
            'Generate & Save Report'
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Report Display */}
      {report && (
        <div className="bg-white border rounded-lg shadow-sm mt-8">
          <div className="border-b p-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">Generated Report</h3>
            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-blue-600 hover:bg-gray-50 hover:text-blue-700"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download Report
            </button>
          </div>
          <div className="p-4 whitespace-pre-wrap font-mono text-sm bg-gray-50">
            {report}
          </div>
        </div>
      )}
    </div>
  );
}
